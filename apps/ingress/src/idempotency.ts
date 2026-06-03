/**
 * Inbound idempotency: a stable per-message key plus a D1-backed ledger of the
 * keys already processed. The queue consumer is the single chokepoint that
 * drops duplicates (queue at-least-once retries + Email Routing redeliveries),
 * recording a key only once a terminal routing decision has been made — so a
 * mid-batch failure re-runs rather than silently dropping mail.
 */

/**
 * Stable idempotency key for an inbound message: the RFC822 Message-ID
 * (namespaced) when present, else a SHA-256 of the raw bytes. The prefixes keep
 * the two key spaces (`mid:` / `sha256:`) from ever colliding.
 */
export async function idempotencyKey(
  headers: Headers,
  raw: ArrayBuffer,
): Promise<string> {
  const id = headers.get("message-id")?.trim();
  if (id) return `mid:${id}`;
  const digest = await crypto.subtle.digest("SHA-256", raw);
  return `sha256:${toHex(digest)}`;
}

const toHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

/** Has this key already been processed? */
export async function isProcessed(
  db: D1Database,
  key: string,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 FROM processed_messages WHERE key = ?")
    .bind(key)
    .first();
  return row !== null;
}

/** Record a key as processed (idempotent). */
export async function markProcessed(
  db: D1Database,
  key: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT OR IGNORE INTO processed_messages (key, seen_at) VALUES (?, ?)",
    )
    .bind(key, Date.now())
    .run();
}
