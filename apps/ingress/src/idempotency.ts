/**
 * Inbound idempotency: a stable per-(recipient, message) key plus a D1-backed
 * ledger of keys already processed. The queue consumer is the single chokepoint
 * that drops duplicates (queue at-least-once retries + Email Routing
 * redeliveries), recording a key only once a terminal routing decision has been
 * made — so a mid-batch failure re-runs rather than silently dropping mail.
 */

import { type Db, processedMessages } from "@manual.email/db";
import { eq } from "drizzle-orm";

/**
 * Stable idempotency key. Scoped by canonical recipient because Email Routing
 * invokes the handler once per recipient with the same Message-ID/bytes — an
 * unscoped key would drop the message for every recipient after the first. The
 * body is the RFC822 Message-ID (namespaced) when present, else a SHA-256 of
 * the raw bytes; the prefixes keep the two key spaces from ever colliding.
 */
export async function idempotencyKey(
  headers: Headers,
  raw: ArrayBuffer,
  recipient: string,
): Promise<string> {
  const id = headers.get("message-id")?.trim();
  const body = id
    ? `mid:${id}`
    : `sha256:${toHex(await crypto.subtle.digest("SHA-256", raw))}`;
  return `${recipient}|${body}`;
}

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

/**
 * Deterministic message id derived from the (recipient-scoped) idempotency key.
 * Used as both the `messages` row PK and the R2 body key so queue retries and
 * Email Routing redeliveries converge on the same row/object instead of
 * creating duplicates. Hex SHA-256, so it's a safe R2 key segment.
 */
export async function deriveId(idempotencyKey: string): Promise<string> {
  const bytes = new TextEncoder().encode(idempotencyKey);
  return toHex(await crypto.subtle.digest("SHA-256", bytes));
}

/** Has this key already been processed? */
export async function isProcessed(db: Db, key: string): Promise<boolean> {
  const row = await db
    .select({ key: processedMessages.key })
    .from(processedMessages)
    .where(eq(processedMessages.key, key))
    .get();
  return row !== undefined;
}

/** Record a key as processed (idempotent). */
export async function markProcessed(db: Db, key: string): Promise<void> {
  await db
    .insert(processedMessages)
    .values({ key, seenAt: Date.now() })
    .onConflictDoNothing();
}
