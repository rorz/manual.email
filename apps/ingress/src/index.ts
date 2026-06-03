/**
 * ingress — inbound email Worker.
 *
 * Responsibilities (to be fleshed out):
 *  1. `email`  — receive mail via Cloudflare Email Routing and enqueue it.
 *  2. `queue`  — consume the ingress queue to filter & sort, then hand
 *                accepted messages to the egress queue.
 *
 * Idempotency: every inbound message carries a stable `dedupeKey`; the queue
 * consumer is the single chokepoint that drops duplicates (queue at-least-once
 * retries + Email Routing redeliveries). Test locally by POSTing a message to
 * `/cdn-cgi/handler/email` — see `test/send.sh`.
 */

import type { IngressMessage } from "@manual.email/contracts";
import { dedupeKey } from "./dedupe";
import { isProcessed, markProcessed } from "./seen";

export default {
  async email(message, env, _ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    // TODO: persist raw to R2 + metadata to D1.
    await env.INGRESS_QUEUE.send({
      dedupeKey: await dedupeKey(message.headers, raw),
      from: message.from,
      to: message.to,
      rawSize: raw.byteLength,
      receivedAt: new Date().toISOString(),
    } satisfies IngressMessage);
  },

  async queue(batch, env, _ctx): Promise<void> {
    for (const message of batch.messages) {
      const { dedupeKey: key } = message.body;
      if (await isProcessed(env.DB, key)) {
        message.ack(); // duplicate / redelivery — already handled
        continue;
      }
      // TODO: filter + sort, then forward accepted mail to EGRESS_QUEUE.
      void env.EGRESS_QUEUE;
      await markProcessed(env.DB, key); // record only after side-effects succeed
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, IngressMessage>;
