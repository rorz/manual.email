/**
 * Dead-letter draining, shared by every Worker that consumes a queue. When a
 * consumer exhausts its retries the message lands on a `*-dlq` queue; the same
 * Worker consumes that DLQ and records each payload here for inspection /
 * replay, so a code-path failure quarantines mail instead of dropping it.
 *
 * The batch is typed structurally (no `@cloudflare/workers-types` dependency)
 * so this stays usable from any Worker — `batch.messages` satisfies it.
 */

import type { Db } from "./client";
import { deadLetters } from "./schema";

/** Cloudflare's convention here: a DLQ is named `<queue>-dlq`. */
export const isDeadLetterQueue = (queue: string): boolean =>
  queue.endsWith("-dlq");

type DeadLetterMessage = { body: unknown; ack: () => void };

/** Persist every message in a DLQ batch, then ack it. */
export async function drainDeadLetters(
  db: Db,
  queue: string,
  messages: Iterable<DeadLetterMessage>,
): Promise<void> {
  const failedAt = Date.now();
  for (const message of messages) {
    await db
      .insert(deadLetters)
      .values({ queue, body: JSON.stringify(message.body), failedAt });
    message.ack();
  }
}
