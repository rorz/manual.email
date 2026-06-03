/**
 * ingress — inbound email Worker.
 *
 * Responsibilities (to be fleshed out):
 *  1. `email`  — receive mail via Cloudflare Email Routing and enqueue it.
 *  2. `queue`  — consume the ingress queue to filter & sort, then hand
 *                accepted messages to the egress queue.
 */

interface IngressMessage {
  from: string;
  to: string;
  rawSize: number;
  receivedAt: string;
}

export default {
  async email(message, env, _ctx): Promise<void> {
    // TODO: parse, validate, and enqueue for downstream processing.
    await env.INGRESS_QUEUE.send({
      from: message.from,
      to: message.to,
      rawSize: message.rawSize,
      receivedAt: new Date().toISOString(),
    } satisfies IngressMessage);
  },

  async queue(batch, env, _ctx): Promise<void> {
    for (const message of batch.messages) {
      // TODO: filtering + sorting logic, then forward to egress.
      void env.EGRESS_QUEUE;
      void message.body;
      message.ack();
    }
  },
} satisfies ExportedHandler<Env, IngressMessage>;
