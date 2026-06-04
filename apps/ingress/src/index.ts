/**
 * ingress — inbound email Worker.
 *
 * Responsibilities (to be fleshed out):
 *  1. `email`  — receive mail via Cloudflare Email Routing and enqueue it.
 *  2. `queue`  — consume the ingress queue, resolve the recipient account,
 *                filter & sort, then hand accepted messages to egress.
 *
 * Idempotency: every inbound message carries a stable, recipient-scoped
 * `idempotencyKey`; the queue consumer is the single chokepoint that drops
 * duplicates. Test locally by POSTing to `/cdn-cgi/handler/email` — see
 * `test/send.sh`.
 */

import {
  type IngressMessage,
  inboundMessageSchema,
} from "@manual.email/contracts";
import {
  createDb,
  drainDeadLetters,
  isDeadLetterQueue,
  messageBodyKey,
  parseAddress,
  unresolvedBodyKey,
} from "@manual.email/db";
import { deliver } from "./delivery";
import {
  deriveId,
  idempotencyKey,
  isProcessed,
  markProcessed,
} from "./idempotency";
import { resolveRecipient } from "./resolution";

const canonical = (address: string): string =>
  parseAddress(address)?.canonical ?? address.trim().toLowerCase();

export default {
  async email(message, env, _ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    const key = await idempotencyKey(
      message.headers,
      raw,
      canonical(message.to),
    );
    // Deterministic id (from the recipient-scoped key) doubles as the row PK and
    // the R2 object id, so queue retries and Email Routing redeliveries converge
    // on the same object/row instead of duplicating.
    const id = await deriveId(key);

    // Resolve the owner here so the raw body is written straight under its
    // account prefix; unknown recipients land under a shared `unresolved/` one.
    const accountId = await resolveRecipient(createDb(env.DB), message.to);
    const r2Key = accountId
      ? messageBodyKey(accountId, id)
      : unresolvedBodyKey(id);
    await env.MESSAGES_BUCKET.put(r2Key, raw);

    // Validate at the trust boundary: this is the only point where untrusted
    // Email Routing data becomes a structured payload. The queue consumer then
    // trusts the contract type (no re-parse).
    const inbound = inboundMessageSchema.parse({
      idempotencyKey: key,
      id,
      r2Key,
      from: message.from,
      to: message.to,
      subject: message.headers.get("subject"),
      messageId: message.headers.get("message-id"),
      inReplyTo: message.headers.get("in-reply-to"),
      rawSize: raw.byteLength,
      receivedAt: new Date().toISOString(),
    } satisfies IngressMessage);
    await env.INGRESS_QUEUE.send(inbound);
  },

  async queue(batch, env, _ctx): Promise<void> {
    const db = createDb(env.DB);
    if (isDeadLetterQueue(batch.queue)) {
      return drainDeadLetters(db, batch.queue, batch.messages);
    }
    for (const message of batch.messages) {
      const body = message.body;
      if (await isProcessed(db, body.idempotencyKey)) {
        message.ack(); // duplicate / redelivery — already handled
        continue;
      }

      const accountId = await resolveRecipient(db, body.to);
      if (accountId) {
        await deliver(db, accountId, body);
      } else {
        // Unresolved recipient — the raw body is parked under `unresolved/`.
        // Bouncing / forward rules are intentionally out of scope; egress is the
        // only worker that sends, fed from EGRESS_QUEUE when that lands.
        void env.EGRESS_QUEUE;
      }

      await markProcessed(db, body.idempotencyKey); // record after the decision
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, IngressMessage>;
