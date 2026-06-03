/**
 * Idempotency key for an inbound message: the RFC822 Message-ID (namespaced)
 * when present, else a SHA-256 of the raw bytes. Stable across redeliveries so
 * the queue consumer can drop duplicates. Prefixes keep the two key spaces
 * (`mid:` / `sha256:`) from ever colliding.
 */
export async function dedupeKey(
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
