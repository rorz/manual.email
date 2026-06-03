/**
 * Idempotency ledger over D1 (`processed_messages`). Read and write are split
 * so the consumer records a key as processed *only after* its side-effects
 * succeed — a mid-batch failure then retries instead of silently dropping mail.
 */

/** Has this dedupe key already been fully processed? */
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

/** Record a dedupe key as processed (idempotent). */
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
