/** Filtering-program boundary — the contract every ingress filter (managed or
 *  custom) speaks. The program runs in a Cloudflare Sandbox, one invocation per
 *  inbound message; its stdout is **untrusted** and parsed with
 *  `filterVerdictSchema`. Anything that doesn't conform is treated as a reject
 *  and quarantined (fail-closed), so a broken program never silently passes mail.
 *
 *  Built with `zod/mini` to match the rest of `contracts`. */

import { z } from "zod/mini";

/** The single inbound message a filtering program decides on. `body` is the
 *  plain-text part extracted from the MIME; `html` is the decoded HTML part
 *  when the MIME includes one; `sender` is the envelope from. */
export const filterInputSchema = z.object({
  body: z.string(),
  html: z.nullable(z.string()),
  sender: z.email(),
  subject: z.nullable(z.string()),
});

/** Upper bound on tags a single verdict may apply — caps untrusted programs. */
export const MAX_TAGS_PER_MESSAGE = 16;

/** A tag slug: lower-case, digit/hyphen, ≤32 chars. The shared vocabulary
 *  between a program's output and the `tags` rows it upserts. */
export const tagSlugSchema = z
  .string()
  .check(z.regex(/^[a-z0-9][a-z0-9-]{0,31}$/));

/** Mail the program let through, with the tags to apply (tag slugs; unknown
 *  slugs are upserted per account). Bounded at the trust boundary so an
 *  untrusted custom program can't create unbounded or malformed tags. */
const passVerdictSchema = z.object({
  disposition: z.literal("pass"),
  tags: z.array(tagSlugSchema).check(z.maxLength(MAX_TAGS_PER_MESSAGE)),
});

/** Mail the program blocked. `category` is display-only metadata; every reject
 *  routes to the Quarantine tray regardless. `reason` is shown to the user. */
const rejectVerdictSchema = z.object({
  category: z.enum(["spam", "phishing", "other"]),
  disposition: z.literal("reject"),
  reason: z.string(),
});

/** The structured verdict a filtering program must emit. Fail-closed: output
 *  that fails this schema is coerced to a reject by the consumer. */
export const filterVerdictSchema = z.discriminatedUnion("disposition", [
  passVerdictSchema,
  rejectVerdictSchema,
]);

export type FilterInput = z.infer<typeof filterInputSchema>;
export type FilterVerdict = z.infer<typeof filterVerdictSchema>;
export type RejectCategory = z.infer<typeof rejectVerdictSchema>["category"];

/** Default managed-program safety policy. Editable, but treated as the
 *  sender-facing pass/reject contract and therefore not the casual tweak point. */
export const DEFAULT_SAFETY_PROMPT =
  "Pass legitimate mail. Reject unsolicited bulk mail as spam and credential " +
  "or payment fraud as phishing. When uncertain, pass the message through.";

/** Default managed-program tagging policy. This is the recommended user-editable
 *  prompt for personalising Important vs Unimportant. */
export const DEFAULT_TAG_PROMPT =
  "Tag genuinely time-sensitive or personally relevant mail as `important`; " +
  "tag routine newsletters, receipts, and notifications as `unimportant`.";

/** Reserved tag slugs the managed program emits and the default trays filter on.
 *  Users may delete the trays, but the slugs stay stable across accounts. */
export const RESERVED_TAGS = {
  important: "important",
  unimportant: "unimportant",
} as const;
