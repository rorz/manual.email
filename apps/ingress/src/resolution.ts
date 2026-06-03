/**
 * Inbound recipient resolution: map an RFC822 `rcpt_to` to the owning platform
 * account. First-party `manual.email` addresses only — an exact match against
 * the registered `addresses` table (after canonicalisation, so `+tag`
 * sub-addressing resolves to the base address). Unknown recipients return
 * `null` and are bounced upstream.
 */

import { parseAddress } from "@manual.email/db";

export async function resolveRecipient(
  db: D1Database,
  raw: string,
): Promise<string | null> {
  const parsed = parseAddress(raw);
  if (!parsed) return null;

  const row = await db
    .prepare("SELECT account_id FROM addresses WHERE address = ?")
    .bind(parsed.canonical)
    .first<{ account_id: string }>();
  return row?.account_id ?? null;
}
