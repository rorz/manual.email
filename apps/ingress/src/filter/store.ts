/**
 * Database reads/writes for filtering: load an account's program config, check
 * for an existing verdict (the cheap-retry gate), and persist a verdict plus
 * any tags it applied.
 *
 * Tag ids are deterministic (`tag_<accountId>_<slug>`) — the same scheme the
 * sign-up seeding uses — so a program emitting `important` reuses the seeded
 * reserved tag instead of creating a duplicate. All writes are
 * `onConflictDoNothing`, so a retried message converges instead of erroring.
 */

import type { FilterVerdict } from "@manual.email/contracts";
import {
  type Db,
  filterConfigs,
  messageTags,
  messageVerdicts,
  tags,
} from "@manual.email/db";
import { eq } from "drizzle-orm";
import type { FilterProgram } from "./executor";

const DEFAULT_PROGRAM: FilterProgram = {
  mode: "managed",
  systemPrompt: "",
  customSource: null,
};

/** An account's program config, defaulting to a managed run when unset. */
export async function loadFilterConfig(
  db: Db,
  accountId: string,
): Promise<FilterProgram> {
  const row = await db
    .select({
      mode: filterConfigs.mode,
      systemPrompt: filterConfigs.systemPrompt,
      customSource: filterConfigs.customSource,
    })
    .from(filterConfigs)
    .where(eq(filterConfigs.accountId, accountId))
    .get();
  return row ?? DEFAULT_PROGRAM;
}

/** Whether a verdict already exists for this message (skip re-filtering). */
export async function hasVerdict(db: Db, messageId: string): Promise<boolean> {
  const row = await db
    .select({ messageId: messageVerdicts.messageId })
    .from(messageVerdicts)
    .where(eq(messageVerdicts.messageId, messageId))
    .get();
  return row !== undefined;
}

/** Persist a verdict and, on pass, upsert + attach its tags. */
export async function recordVerdict(
  db: Db,
  accountId: string,
  messageId: string,
  verdict: FilterVerdict,
): Promise<void> {
  await db
    .insert(messageVerdicts)
    .values({
      messageId,
      disposition: verdict.disposition,
      category: verdict.disposition === "reject" ? verdict.category : null,
      reason: verdict.disposition === "reject" ? verdict.reason : null,
    })
    .onConflictDoNothing();

  if (verdict.disposition === "pass" && verdict.tags.length > 0) {
    await applyTags(db, accountId, messageId, verdict.tags);
  }
}

async function applyTags(
  db: Db,
  accountId: string,
  messageId: string,
  slugs: string[],
): Promise<void> {
  const unique = [...new Set(slugs)];
  const tagId = (slug: string) => `tag_${accountId}_${slug}`;

  await db
    .insert(tags)
    .values(
      unique.map((slug) => ({ id: tagId(slug), accountId, slug, label: slug })),
    )
    .onConflictDoNothing();
  await db
    .insert(messageTags)
    .values(unique.map((slug) => ({ messageId, tagId: tagId(slug) })))
    .onConflictDoNothing();
}
