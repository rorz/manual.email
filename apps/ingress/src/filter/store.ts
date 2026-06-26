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

import {
  DEFAULT_SAFETY_PROMPT,
  DEFAULT_TAG_PROMPT,
  type FilterVerdict,
} from "@manual.email/contracts";
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
  customSource: null,
  mode: "managed",
  safetyPrompt: DEFAULT_SAFETY_PROMPT,
  tagPrompt: DEFAULT_TAG_PROMPT,
};

/** An account's program config, defaulting to a managed run when unset. */
export const loadFilterConfig = async (
  db: Db,
  accountId: string,
): Promise<FilterProgram> => {
  const row = await db
    .select({
      customSource: filterConfigs.customSource,
      mode: filterConfigs.mode,
      safetyPrompt: filterConfigs.safetyPrompt,
      tagPrompt: filterConfigs.tagPrompt,
    })
    .from(filterConfigs)
    .where(eq(filterConfigs.accountId, accountId))
    .get();
  if (!row) return DEFAULT_PROGRAM;
  return {
    customSource: row.customSource,
    mode: row.mode,
    safetyPrompt: row.safetyPrompt.trim() || DEFAULT_SAFETY_PROMPT,
    tagPrompt: row.tagPrompt.trim() || DEFAULT_TAG_PROMPT,
  };
};

/** Whether a verdict already exists for this message (skip re-filtering). */
export const hasVerdict = async (
  db: Db,
  messageId: string,
): Promise<boolean> => {
  const row = await db
    .select({ messageId: messageVerdicts.messageId })
    .from(messageVerdicts)
    .where(eq(messageVerdicts.messageId, messageId))
    .get();
  return row !== undefined;
};

/** Persist a verdict and, on pass, upsert + attach its tags. */
export const recordVerdict = async (
  db: Db,
  accountId: string,
  messageId: string,
  verdict: FilterVerdict,
): Promise<void> => {
  await db
    .insert(messageVerdicts)
    .values({
      category: verdict.disposition === "reject" ? verdict.category : null,
      disposition: verdict.disposition,
      messageId,
      reason: verdict.disposition === "reject" ? verdict.reason : null,
    })
    .onConflictDoNothing();

  if (verdict.disposition === "pass" && verdict.tags.length > 0) {
    await applyTags(db, accountId, messageId, verdict.tags);
  }
};

const applyTags = async (
  db: Db,
  accountId: string,
  messageId: string,
  slugs: string[],
): Promise<void> => {
  const unique = [...new Set(slugs)];
  const tagId = (slug: string) => `tag_${accountId}_${slug}`;

  await db
    .insert(tags)
    .values(
      unique.map((slug) => ({ accountId, id: tagId(slug), label: slug, slug })),
    )
    .onConflictDoNothing();
  await db
    .insert(messageTags)
    .values(unique.map((slug) => ({ messageId, tagId: tagId(slug) })))
    .onConflictDoNothing();
};
