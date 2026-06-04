/**
 * egress — outbound email Worker.
 *
 * Consumes the egress queue and sends mail through Cloudflare Email Service via
 * the `SEND_EMAIL` binding (`env.SEND_EMAIL.send({ to, from, subject, ... })`),
 * which delivers transactional mail to arbitrary recipients. Logic to be
 * fleshed out.
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
      // TODO: env.SEND_EMAIL.send({ to, from, subject, html, text }) — the
      // Email Service builder; no manual MIME assembly required.
      void env.SEND_EMAIL;
      void message.body;
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, EgressMessage>;
