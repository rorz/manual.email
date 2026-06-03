/**
 * Inbound recipient resolution: map an RFC822 `rcpt_to` to the owning platform
 * account. First-party `manual.email` addresses only — an exact match against
 * the registered `addresses` table (after canonicalisation, so `+tag`
 * sub-addressing resolves to the base address). Unknown recipients return
 * `null` and are bounced upstream.
 */

import { addresses, type Db, parseAddress } from "@manual.email/db";
import { eq } from "drizzle-orm";

export async function resolveRecipient(
  db: Db,
  raw: string,
): Promise<string | null> {
  const parsed = parseAddress(raw);
  if (!parsed) return null;

  const row = await db
    .select({ accountId: addresses.accountId })
    .from(addresses)
    .where(eq(addresses.address, parsed.canonical))
    .get();
  return row?.accountId ?? null;
}
