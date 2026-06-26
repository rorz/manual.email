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

import {
  DEFAULT_SAFETY_PROMPT,
  DEFAULT_TAG_PROMPT,
  RESERVED_TAGS,
} from "@manual.email/contracts";
import {
  type Db,
  filterConfigs,
  tags,
  trays,
  trayTags,
} from "@manual.email/db";

const tagId = (accountId: string, slug: string) => `tag_${accountId}_${slug}`;
const trayId = (accountId: string, key: string) => `tray_${accountId}_${key}`;

/** Reserved tags, in display order. */
const DEFAULT_TAGS = [
  { label: "Important", position: 0, slug: RESERVED_TAGS.important },
  { label: "Unimportant", position: 1, slug: RESERVED_TAGS.unimportant },
] as const;

/** Default trays. `tagSlug` links a `tag` tray to its backing reserved tag. */
const DEFAULT_TRAYS = [
  { key: "everything", kind: "everything", name: "Everything", position: 0 },
  {
    color: "#a16207",
    icon: "star",
    key: RESERVED_TAGS.important,
    kind: "tag",
    name: "Important",
    position: 1,
    tagSlug: RESERVED_TAGS.important,
  },
  {
    color: "#525252",
    icon: "archive",
    key: RESERVED_TAGS.unimportant,
    kind: "tag",
    name: "Unimportant",
    position: 2,
    tagSlug: RESERVED_TAGS.unimportant,
  },
  { key: "quarantine", kind: "quarantine", name: "Quarantine", position: 3 },
] as const;

/**
 * Seed the default tags, trays, and managed filter config for `accountId`.
 * Safe to call repeatedly (idempotent).
 */
export const seedAccountDefaults = async (
  db: Db,
  accountId: string,
): Promise<void> => {
  await db
    .insert(tags)
    .values(
      DEFAULT_TAGS.map((t) => ({
        accountId,
        id: tagId(accountId, t.slug),
        label: t.label,
        position: t.position,
        slug: t.slug,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(trays)
    .values(
      DEFAULT_TRAYS.map((t) => ({
        accountId,
        color: "color" in t ? t.color : null,
        icon: "icon" in t ? t.icon : null,
        id: trayId(accountId, t.key),
        kind: t.kind,
        name: t.name,
        position: t.position,
      })),
    )
    .onConflictDoNothing();

  const links = DEFAULT_TRAYS.filter(
    (t): t is typeof t & { tagSlug: string } => "tagSlug" in t,
  ).map((t) => ({
    tagId: tagId(accountId, t.tagSlug),
    trayId: trayId(accountId, t.key),
  }));
  if (links.length > 0) {
    await db.insert(trayTags).values(links).onConflictDoNothing();
  }

  await db
    .insert(filterConfigs)
    .values({
      accountId,
      mode: "managed",
      safetyPrompt: DEFAULT_SAFETY_PROMPT,
      tagPrompt: DEFAULT_TAG_PROMPT,
    })
    .onConflictDoNothing();
};
