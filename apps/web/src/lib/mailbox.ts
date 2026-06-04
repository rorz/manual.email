import { env } from "cloudflare:workers";
import {
  accounts,
  addresses,
  createDb,
  type Db,
  messages,
  messageTags,
  messageVerdicts,
  parseAddress,
  type TrayKind,
  tags,
  trays,
  trayTags,
} from "@manual.email/db";
import {
  normalizeTrayColor,
  normalizeTrayIcon,
} from "@manual.email/ui/tray-options";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { seedAccountDefaults } from "./defaults";

export interface Mailbox {
  accountId: string;
  address: string;
}

export interface MailTag {
  id: string;
  slug: string;
  label: string;
  color: string | null;
}

export interface MailTray {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  kind: TrayKind;
  position: number;
  tags: MailTag[];
}

export interface MailMessage {
  id: string;
  subject: string | null;
  mailFrom: string;
  receivedAt: number;
  disposition: "pass" | "reject";
  tags: MailTag[];
}

export interface MailboxView {
  messages: MailMessage[];
  selectedTray: MailTray | null;
  tags: MailTag[];
  trays: MailTray[];
}

const db = (): Db => createDb(env.DB);

const lookup = async (d: Db, canonical: string): Promise<string | null> => {
  const rows = await d
    .select({ accountId: addresses.accountId })
    .from(addresses)
    .where(eq(addresses.address, canonical))
    .limit(1);
  return rows[0]?.accountId ?? null;
};

export const resolveMailbox = async (
  email: string,
): Promise<Mailbox | null> => {
  const parsed = parseAddress(email);
  if (!parsed) return null;
  const { canonical } = parsed;
  const d = db();

  const existing = await lookup(d, canonical);
  if (existing) return { accountId: existing, address: canonical };

  const accountId = `acct_${crypto.randomUUID()}`;
  await d
    .insert(accounts)
    .values({ id: accountId, displayName: null })
    .onConflictDoNothing();
  await d
    .insert(addresses)
    .values({ address: canonical, accountId, isPrimary: true })
    .onConflictDoNothing();

  // Re-read so a concurrent sign-up that won the insert race still resolves.
  const winner = await lookup(d, canonical);
  if (!winner) return null;
  // Seed the winning account's default trays/tags/filter config (idempotent).
  await seedAccountDefaults(d, winner);
  return { accountId: winner, address: canonical };
};

export const listMailboxView = async (
  accountId: string,
  requestedTrayId: string | null,
): Promise<MailboxView> => {
  const d = db();
  const [allTags, allTrays, links] = await Promise.all([
    listTags(d, accountId),
    listTrays(d, accountId),
    listTrayTags(d, accountId),
  ]);
  const tagById = new Map(allTags.map((tag) => [tag.id, tag]));
  const trayViews = allTrays.map((tray) => ({
    ...tray,
    tags: links
      .filter((link) => link.trayId === tray.id)
      .map((link) => tagById.get(link.tagId))
      .filter((tag): tag is MailTag => tag !== undefined),
  }));
  const selectedTray =
    trayViews.find((tray) => tray.id === requestedTrayId) ??
    trayViews.find((tray) => tray.kind === "everything") ??
    trayViews[0] ??
    null;

  return {
    messages: selectedTray
      ? await listMessagesForTray(d, accountId, selectedTray, tagById)
      : [],
    selectedTray,
    tags: allTags,
    trays: trayViews,
  };
};

export const createTray = async (
  accountId: string,
  name: string,
  tagIds: string[],
  appearance: TrayAppearance,
): Promise<void> => {
  const d = db();
  const label = normalizeName(name);
  if (!label) return;
  const ownedTagIds = await ownedTags(d, accountId, tagIds);
  const last = await d
    .select({ position: trays.position })
    .from(trays)
    .where(eq(trays.accountId, accountId))
    .orderBy(desc(trays.position))
    .limit(1);
  const trayId = `tray_${accountId}_${crypto.randomUUID()}`;

  await d.insert(trays).values({
    id: trayId,
    accountId,
    name: label,
    color: normalizeTrayColor(appearance.color ?? null),
    icon: normalizeTrayIcon(appearance.icon ?? null),
    kind: "tag",
    position: (last[0]?.position ?? 0) + 1,
  });
  await replaceTrayTags(d, trayId, ownedTagIds);
};

export const deleteTray = async (
  accountId: string,
  trayId: string,
): Promise<void> => {
  const tray = await findEditableTray(db(), accountId, trayId);
  if (!tray) return;
  await db().delete(trays).where(eq(trays.id, tray.id));
};

export const updateTray = async (
  accountId: string,
  trayId: string,
  name: string,
  tagIds: string[],
  appearance: TrayAppearance,
): Promise<void> => {
  const d = db();
  const tray = await findEditableTray(d, accountId, trayId);
  const label = normalizeName(name);
  if (!(tray && label)) return;
  const ownedTagIds = await ownedTags(d, accountId, tagIds);

  await d
    .update(trays)
    .set({
      color: normalizeTrayColor(appearance.color ?? null),
      icon: normalizeTrayIcon(appearance.icon ?? null),
      name: label,
    })
    .where(eq(trays.id, tray.id));
  await replaceTrayTags(d, tray.id, ownedTagIds);
};

interface TrayAppearance {
  color?: string;
  icon?: string;
}

const listTags = (d: Db, accountId: string): Promise<MailTag[]> =>
  d
    .select({
      id: tags.id,
      slug: tags.slug,
      label: tags.label,
      color: tags.color,
    })
    .from(tags)
    .where(eq(tags.accountId, accountId))
    .orderBy(asc(tags.position), asc(tags.label));

const listTrays = (d: Db, accountId: string) =>
  d
    .select({
      id: trays.id,
      name: trays.name,
      color: trays.color,
      icon: trays.icon,
      kind: trays.kind,
      position: trays.position,
    })
    .from(trays)
    .where(eq(trays.accountId, accountId))
    .orderBy(asc(trays.position), asc(trays.name));

const listTrayTags = (d: Db, accountId: string) =>
  d
    .select({ tagId: trayTags.tagId, trayId: trayTags.trayId })
    .from(trayTags)
    .innerJoin(trays, eq(trayTags.trayId, trays.id))
    .where(eq(trays.accountId, accountId));

const listMessagesForTray = async (
  d: Db,
  accountId: string,
  tray: MailTray,
  tagById: Map<string, MailTag>,
): Promise<MailMessage[]> => {
  const disposition = tray.kind === "quarantine" ? "reject" : "pass";
  let messageIds: string[] | null = null;
  if (tray.kind === "tag") {
    const trayTagIds = tray.tags.map((tag) => tag.id);
    if (trayTagIds.length === 0) return [];
    const tagged = await d
      .select({ messageId: messageTags.messageId })
      .from(messageTags)
      .where(inArray(messageTags.tagId, trayTagIds));
    messageIds = [...new Set(tagged.map((row) => row.messageId))];
    if (messageIds.length === 0) return [];
  }

  const rows = await d
    .select({
      disposition: messageVerdicts.disposition,
      id: messages.id,
      mailFrom: messages.mailFrom,
      receivedAt: messages.receivedAt,
      subject: messages.subject,
    })
    .from(messages)
    .innerJoin(messageVerdicts, eq(messageVerdicts.messageId, messages.id))
    .where(
      and(
        eq(messages.accountId, accountId),
        eq(messageVerdicts.disposition, disposition),
        messageIds ? inArray(messages.id, messageIds) : undefined,
      ),
    )
    .orderBy(desc(messages.receivedAt));

  const byMessageId = await tagsByMessageId(
    d,
    rows.map((row) => row.id),
    tagById,
  );
  return rows.map((row) => ({
    ...row,
    tags: byMessageId.get(row.id) ?? [],
  }));
};

const tagsByMessageId = async (
  d: Db,
  messageIds: string[],
  tagById: Map<string, MailTag>,
): Promise<Map<string, MailTag[]>> => {
  if (messageIds.length === 0) return new Map();
  const rows = await d
    .select({ messageId: messageTags.messageId, tagId: messageTags.tagId })
    .from(messageTags)
    .where(inArray(messageTags.messageId, messageIds));
  const result = new Map<string, MailTag[]>();
  for (const row of rows) {
    const tag = tagById.get(row.tagId);
    if (!tag) continue;
    result.set(row.messageId, [...(result.get(row.messageId) ?? []), tag]);
  }
  return result;
};

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").slice(0, 48);

const ownedTags = async (
  d: Db,
  accountId: string,
  rawTagIds: string[],
): Promise<string[]> => {
  const tagIds = [...new Set(rawTagIds.filter(Boolean))];
  if (tagIds.length === 0) return [];
  const rows = await d
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.accountId, accountId), inArray(tags.id, tagIds)));
  return rows.map((row) => row.id);
};

const findEditableTray = (d: Db, accountId: string, trayId: string) =>
  d
    .select({ id: trays.id })
    .from(trays)
    .where(
      and(
        eq(trays.accountId, accountId),
        eq(trays.id, trayId),
        eq(trays.kind, "tag"),
      ),
    )
    .get();

const replaceTrayTags = async (
  d: Db,
  trayId: string,
  tagIds: string[],
): Promise<void> => {
  await d.delete(trayTags).where(eq(trayTags.trayId, trayId));
  if (tagIds.length === 0) return;
  await d
    .insert(trayTags)
    .values(tagIds.map((tagId) => ({ tagId, trayId })))
    .onConflictDoNothing();
};
