/**
 * ingress — inbound email Worker.
 *
 * Responsibilities (to be fleshed out):
 *  1. `email`  — receive mail via Cloudflare Email Routing and enqueue it.
 *  2. `queue`  — consume the ingress queue, resolve the recipient account,
 *                filter & sort, then hand accepted messages to egress.
 *
 * Idempotency: every inbound message carries a stable `idempotencyKey`; the
 * queue consumer is the single chokepoint that drops duplicates. Test locally
 * by POSTing a message to `/cdn-cgi/handler/email` — see `test/send.sh`.
 */

import type { IngressMessage } from "@manual.email/contracts";
import { idempotencyKey, isProcessed, markProcessed } from "./idempotency";
import { resolveRecipient } from "./resolution";

export default {
  async email(message, env, _ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    // TODO: persist raw to R2 + metadata to D1.
    await env.INGRESS_QUEUE.send({
      idempotencyKey: await idempotencyKey(message.headers, raw),
      from: message.from,
      to: message.to,
      rawSize: raw.byteLength,
      receivedAt: new Date().toISOString(),
    } satisfies IngressMessage);
  },

  async queue(batch, env, _ctx): Promise<void> {
    for (const message of batch.messages) {
      const { idempotencyKey: key, to } = message.body;
      if (await isProcessed(env.DB, key)) {
        message.ack(); // duplicate / redelivery — already handled
        continue;
      }

      const accountId = await resolveRecipient(env.DB, to);
      if (accountId) {
        // TODO: filter + sort, persist for `accountId`, forward to EGRESS_QUEUE.
        void env.EGRESS_QUEUE;
        void accountId;
      } else {
        // TODO: unresolved recipient — bounce / reject.
      }

      await markProcessed(env.DB, key); // record once the routing decision is made
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, IngressMessage>;
