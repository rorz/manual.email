/** Queue payload schemas — the source of truth for worker message shapes.
 *  Built with `zod/mini`: the ingress worker is the only runtime that imports
 *  these as values (to validate inbound mail), so the tree-shakable mini API
 *  keeps that bundle small. */

import { z } from "zod/mini";

/** Inbound mail enqueued by ingress (from Email Routing). */
export const inboundMessageSchema = z.object({
  /** Idempotency key — see ingress `idempotencyKey` (RFC822 Message-ID or body hash). */
  idempotencyKey: z.string().check(z.minLength(1)),
  from: z.email(),
  to: z.email(),
  rawSize: z.number().check(z.int(), z.nonnegative()),
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
