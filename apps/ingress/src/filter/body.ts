/**
 * Extract the body parts a filter program sees from raw RFC822 bytes.
 *
 * `postal-mime` decodes the MIME tree; we prefer the text part and fall back to
 * a crude tag-strip of the HTML part for `body`, while preserving the decoded
 * HTML part when present. Each part is capped so a large mail (or an
 * attachment-laden one) can't blow up the LLM payload, cost, or latency.
 */

import PostalMime from "postal-mime";

interface ExtractedBodies {
  body: string;
  html: string | null;
}

/** Upper bounds on body characters handed to a program. */
const MAX_TEXT_CHARS = 16_000;
const MAX_HTML_CHARS = 32_000;

export const extractBodies = async (
  raw: ArrayBuffer,
): Promise<ExtractedBodies> => {
  const email = await PostalMime.parse(raw);
  const body = email.text ?? (email.html ? stripHtml(email.html) : "");
  const html = email.html ? email.html.slice(0, MAX_HTML_CHARS) : null;
  return { body: body.slice(0, MAX_TEXT_CHARS), html };
};

const stripHtml = (html: string): string =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
