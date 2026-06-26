/**
 * egress — outbound email Worker.
 *
 * Consumes the egress queue and sends mail through Cloudflare Email Service via
 * the `SEND_EMAIL` binding's structured builder
 * (`env.SEND_EMAIL.send({ from, to, subject, text, html })`), which delivers
 * transactional mail to arbitrary recipients. No MIME assembly, and explicitly
 * not Email Routing's verified-only send.
 */

import type { EgressMessage } from "@manual.email/contracts";
import {
  createDb,
  drainDeadLetters,
  isDeadLetterQueue,
} from "@manual.email/db";

export default {
  async queue(batch, env, _ctx): Promise<void> {
    if (isDeadLetterQueue(batch.queue)) {
      return drainDeadLetters(createDb(env.DB), batch.queue, batch.messages);
    }
    for (const message of batch.messages) {
      try {
        const { from, to, subject, text, html } = message.body;
        await env.SEND_EMAIL.send({
          from,
          subject,
          text,
          to,
          ...(html !== undefined && { html }),
        });
        message.ack();
      } catch (error) {
        // Email Service rejected/failed — leave it for the queue to retry, then
        // DLQ once retries are exhausted. Never silently drop outbound mail.
        console.error("egress send failed", {
          code: (error as { code?: string }).code,
          message: (error as Error).message,
          to: message.body?.to,
        });
        message.retry();
      }
    }
  },
} satisfies ExportedHandler<Env, EgressMessage>;
