/**
 * Mailbox delivery: write an inbound `messages` row for a resolved recipient.
 * The raw body already lives in R2 (persisted at the trust boundary); this
 * records the metadata that makes the message show up in the client.
 *
 * Idempotent by design: the row id is the deterministic message id carried on
 * the queue payload, so a retry (markProcessed runs only after this) re-inserts
 * the same row and `onConflictDoNothing` makes it a no-op.
 */

import type { IngressMessage } from "@manual.email/contracts";
import { type Db, messages } from "@manual.email/db";
import { and, eq } from "drizzle-orm";

export async function deliver(
  db: Db,
  accountId: string,
  body: IngressMessage,
): Promise<void> {
  const threadId = await resolveThread(db, accountId, body);
  await db
    .insert(messages)
    .values({
      id: body.id,
      accountId,
      direction: "inbound",
      messageId: body.messageId,
      inReplyTo: body.inReplyTo,
      threadId,
      mailFrom: body.from,
      rcptTo: body.to,
      subject: body.subject,
      sizeBytes: body.rawSize,
      r2Key: body.r2Key,
      receivedAt: Date.parse(body.receivedAt),
    })
    .onConflictDoNothing();
}

/**
 * Thread id for an inbound message: inherit the parent's thread when this is a
 * reply to a message already in the same mailbox, else start a new thread keyed
 * by the RFC822 Message-ID (falling back to the derived id when absent).
 */
async function resolveThread(
  db: Db,
  accountId: string,
  body: IngressMessage,
): Promise<string> {
  if (body.inReplyTo) {
    const parent = await db
      .select({ threadId: messages.threadId })
      .from(messages)
      .where(
        and(
          eq(messages.accountId, accountId),
          eq(messages.messageId, body.inReplyTo),
        ),
      )
      .get();
    if (parent?.threadId) return parent.threadId;
  }
  return body.messageId ?? body.id;
}
