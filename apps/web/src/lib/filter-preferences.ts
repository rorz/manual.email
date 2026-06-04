import { env } from "cloudflare:workers";
import {
  DEFAULT_SAFETY_PROMPT,
  DEFAULT_TAG_PROMPT,
} from "@manual.email/contracts";
import {
  createDb,
  type Db,
  type FilterMode,
  filterConfigs,
} from "@manual.email/db";
import { eq } from "drizzle-orm";

export interface FilterPreferences {
  customSource: string | null;
  mode: FilterMode;
  safetyPrompt: string;
  tagPrompt: string;
}

export const DEFAULT_CUSTOM_SOURCE = `import type { FilterProgram } from "./filter-contract.ts";

/**
 * A custom program receives one email:
 *
 * input.subject  string | null  decoded Subject header
 * input.sender   string         SMTP envelope sender
 * input.body     string         plain-text body, capped before execution
 * input.html     string | null  decoded HTML body, capped before execution
 *
 * It must return either:
 *
 * { disposition: "pass", tags: ["important"] }
 * { disposition: "reject", category: "spam" | "phishing" | "other", reason: "..." }
 *
 * Tag slugs must be lowercase letters, numbers, or hyphens.
 *
 * Available in the Sandbox: Bun, TypeScript, internet access, zod,
 * ai, and @ai-sdk/google. Custom programs do not receive first-party secrets.
 */

const filter: FilterProgram = async (input) => {
  const subject = input.subject ?? "";
  const content = [subject, input.sender, input.body, input.html ?? ""]
    .join("\\n")
    .toLowerCase();

  if (/unsubscribe|newsletter|digest|receipt/.test(content)) {
    return { disposition: "pass", tags: ["unimportant"] };
  }

  if (/password|verify|payment|wallet|bank/.test(content)) {
    return {
      disposition: "reject",
      category: "phishing",
      reason: "Credential or payment-themed mail matched the custom filter.",
    };
  }

  return { disposition: "pass", tags: ["important"] };
};

export default filter;
`;

const db = (): Db => createDb(env.DB);

export const getFilterPreferences = async (
  accountId: string,
): Promise<FilterPreferences> => {
  const row = await db()
    .select({
      customSource: filterConfigs.customSource,
      mode: filterConfigs.mode,
      safetyPrompt: filterConfigs.safetyPrompt,
      tagPrompt: filterConfigs.tagPrompt,
    })
    .from(filterConfigs)
    .where(eq(filterConfigs.accountId, accountId))
    .get();

  return {
    customSource: row?.customSource ?? null,
    mode: row?.mode ?? "managed",
    safetyPrompt: normalizePrompt(row?.safetyPrompt, DEFAULT_SAFETY_PROMPT),
    tagPrompt: normalizePrompt(row?.tagPrompt, DEFAULT_TAG_PROMPT),
  };
};

export const saveManagedFilter = async (
  accountId: string,
  safetyPrompt: string,
  tagPrompt: string,
): Promise<void> => {
  const next = {
    mode: "managed" as const,
    safetyPrompt: normalizePrompt(safetyPrompt, DEFAULT_SAFETY_PROMPT),
    tagPrompt: normalizePrompt(tagPrompt, DEFAULT_TAG_PROMPT),
    updatedAt: Date.now(),
  };
  await db()
    .insert(filterConfigs)
    .values({ accountId, ...next, customSource: null })
    .onConflictDoUpdate({
      target: filterConfigs.accountId,
      set: next,
    });
};

export const saveCustomFilter = async (
  accountId: string,
  customSource: string,
): Promise<void> => {
  const next = {
    mode: "custom" as const,
    customSource: customSource.trim() || DEFAULT_CUSTOM_SOURCE,
    updatedAt: Date.now(),
  };
  await db()
    .insert(filterConfigs)
    .values({
      accountId,
      ...next,
      safetyPrompt: DEFAULT_SAFETY_PROMPT,
      tagPrompt: DEFAULT_TAG_PROMPT,
    })
    .onConflictDoUpdate({
      target: filterConfigs.accountId,
      set: next,
    });
};

const normalizePrompt = (value: string | null | undefined, fallback: string) =>
  value?.trim() || fallback;
