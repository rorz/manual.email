/**
 * Extract the plain-text body a filter program sees from raw RFC822 bytes.
 *
 * `postal-mime` decodes the MIME tree; we prefer the text part and fall back to
 * a crude tag-strip of the HTML part. The result is capped so a large mail (or
 * an attachment-laden one) can't blow up the LLM payload, cost, or latency —
 * the classifier only needs the gist.
 */

import PostalMime from "postal-mime";

/** Upper bound on body characters handed to a program. */
const MAX_BODY_CHARS = 16_000;

export async function extractText(raw: ArrayBuffer): Promise<string> {
  const email = await PostalMime.parse(raw);
  const text = email.text ?? (email.html ? stripHtml(email.html) : "");
  return text.slice(0, MAX_BODY_CHARS);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
