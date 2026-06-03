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
import { createDb, parseAddress } from "@manual.email/db";
import { idempotencyKey, isProcessed, markProcessed } from "./idempotency";
import { resolveRecipient } from "./resolution";

const canonical = (address: string): string =>
  parseAddress(address)?.canonical ?? address.trim().toLowerCase();

export default {
  async email(message, env, _ctx): Promise<void> {
    const raw = await new Response(message.raw).arrayBuffer();
    // TODO: persist raw to R2 + metadata to D1.
    // Validate at the trust boundary: this is the only point where untrusted
    // Email Routing data becomes a structured payload. The queue consumer
    // then trusts the contract type (no re-parse).
    const inbound = inboundMessageSchema.parse({
      idempotencyKey: await idempotencyKey(
        message.headers,
        raw,
        canonical(message.to),
      ),
      from: message.from,
      to: message.to,
      rawSize: raw.byteLength,
      receivedAt: new Date().toISOString(),
    } satisfies IngressMessage);
    await env.INGRESS_QUEUE.send(inbound);
  },

  async queue(batch, env, _ctx): Promise<void> {
    const db = createDb(env.DB);
    for (const message of batch.messages) {
      const { idempotencyKey: key, to } = message.body;
      if (await isProcessed(db, key)) {
        message.ack(); // duplicate / redelivery — already handled
        continue;
      }

      const accountId = await resolveRecipient(db, to);
      if (accountId) {
        // TODO: filter + sort, persist for `accountId`, forward to EGRESS_QUEUE.
        void env.EGRESS_QUEUE;
        void accountId;
      } else {
        // TODO: unresolved recipient — bounce / reject.
      }

      await markProcessed(db, key); // record once the routing decision is made
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, IngressMessage>;
