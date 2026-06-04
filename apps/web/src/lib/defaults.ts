/**
 * Default workspace provisioned for every new mailbox.
 *
 * A fresh account starts with the reserved tags the managed filter program
 * emits (`important` / `unimportant`) and four trays: the always-present
 * **Everything** and **Quarantine** views plus the deletable **Important** /
 * **Unimportant** tag views. It also gets a `managed` filter config so inbound
 * mail is filtered from the first message.
 *
 * Idempotent by construction: every row uses a deterministic id derived from
 * the account, so re-running under sign-up retries or the lazy reconciliation
 * paths is a no-op via `onConflictDoNothing`.
 */

import { RESERVED_TAGS } from "@manual.email/contracts";
import {
  type Db,
  filterConfigs,
  tags,
  trays,
  trayTags,
} from "@manual.email/db";

/** Default system prompt for the managed program — user-editable in Preferences. */
const DEFAULT_SYSTEM_PROMPT =
  "Triage each email. Tag genuinely time-sensitive or personally relevant " +
  "mail as `important`; tag routine newsletters, receipts, and notifications " +
  "as `unimportant`. Reject unsolicited bulk mail as spam and credential-" +
  "harvesting attempts as phishing.";

const tagId = (accountId: string, slug: string) => `tag_${accountId}_${slug}`;
const trayId = (accountId: string, key: string) => `tray_${accountId}_${key}`;

/** Reserved tags, in display order. */
const DEFAULT_TAGS = [
  { slug: RESERVED_TAGS.important, label: "Important", position: 0 },
  { slug: RESERVED_TAGS.unimportant, label: "Unimportant", position: 1 },
] as const;

/** Default trays. `tagSlug` links a `tag` tray to its backing reserved tag. */
const DEFAULT_TRAYS = [
  { key: "everything", name: "Everything", kind: "everything", position: 0 },
  {
    key: RESERVED_TAGS.important,
    name: "Important",
    kind: "tag",
    position: 1,
    tagSlug: RESERVED_TAGS.important,
  },
  {
    key: RESERVED_TAGS.unimportant,
    name: "Unimportant",
    kind: "tag",
    position: 2,
    tagSlug: RESERVED_TAGS.unimportant,
  },
  { key: "quarantine", name: "Quarantine", kind: "quarantine", position: 3 },
] as const;

/**
 * Seed the default tags, trays, and managed filter config for `accountId`.
 * Safe to call repeatedly (idempotent).
 */
export async function seedAccountDefaults(
  db: Db,
  accountId: string,
): Promise<void> {
  await db
    .insert(tags)
    .values(
      DEFAULT_TAGS.map((t) => ({
        id: tagId(accountId, t.slug),
        accountId,
        slug: t.slug,
        label: t.label,
        position: t.position,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(trays)
    .values(
      DEFAULT_TRAYS.map((t) => ({
        id: trayId(accountId, t.key),
        accountId,
        name: t.name,
        kind: t.kind,
        position: t.position,
      })),
    )
    .onConflictDoNothing();

  const links = DEFAULT_TRAYS.filter(
    (t): t is typeof t & { tagSlug: string } => "tagSlug" in t,
  ).map((t) => ({
    trayId: trayId(accountId, t.key),
    tagId: tagId(accountId, t.tagSlug),
  }));
  if (links.length > 0) {
    await db.insert(trayTags).values(links).onConflictDoNothing();
  }

  await db
    .insert(filterConfigs)
    .values({ accountId, mode: "managed", systemPrompt: DEFAULT_SYSTEM_PROMPT })
    .onConflictDoNothing();
}
