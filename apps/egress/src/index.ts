/**
 * egress — outbound email Worker.
 *
 * Consumes the egress queue and sends mail via the `SEND_EMAIL` binding
 * (Cloudflare Email Routing's send_email). Logic to be fleshed out.
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
      // TODO: build a MIME message and send via env.SEND_EMAIL.
      void env.SEND_EMAIL;
      void message.body;
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, EgressMessage>;
