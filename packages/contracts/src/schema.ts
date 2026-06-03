/** Queue payload schemas — the source of truth for worker message shapes. */

import { z } from "zod";

/** Inbound mail enqueued by ingress (from Email Routing). */
export const inboundMessageSchema = z.object({
  /** Idempotency key — see ingress `dedupeKey` (RFC822 Message-ID or body hash). */
  dedupeKey: z.string().min(1),
  from: z.email(),
  to: z.email(),
  rawSize: z.number().int().nonnegative(),
  receivedAt: z.iso.datetime(),
});

/** Outbound mail handed to egress for sending. */
export const outboundMessageSchema = z.object({
  from: z.email(),
  to: z.email(),
  subject: z.string(),
});

/** Generic acknowledgement. */
export const ackSchema = z.object({ ok: z.boolean() });
