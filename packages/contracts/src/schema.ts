/** Queue payload schemas — the source of truth for worker message shapes.
 *  Built with `zod/mini`: the ingress worker is the only runtime that imports
 *  these as values (to validate inbound mail), so the tree-shakable mini API
 *  keeps that bundle small. */

import { z } from "zod/mini";

/** Inbound mail enqueued by ingress (from Email Routing). */
export const inboundMessageSchema = z.object({
  /** Idempotency key — see ingress `idempotencyKey` (RFC822 Message-ID or body hash). */
  idempotencyKey: z.string().check(z.minLength(1)),
  /** Deterministic message id (derived from `idempotencyKey`): the `messages`
   *  row PK and the R2 body key, so retries/redeliveries converge on one row. */
  id: z.string().check(z.minLength(1)),
  /** R2 key of the raw RFC822 body persisted by `email()`. */
  r2Key: z.string().check(z.minLength(1)),
  from: z.email(),
  to: z.email(),
  /** RFC822 `Subject`, if present. */
  subject: z.nullable(z.string()),
  /** RFC822 `Message-ID` header, if present. */
  messageId: z.nullable(z.string()),
  /** RFC822 `In-Reply-To` header, if present (threading). */
  inReplyTo: z.nullable(z.string()),
  rawSize: z.number().check(z.int(), z.nonnegative()),
  receivedAt: z.iso.datetime(),
});

/** Outbound mail handed to egress for sending via Cloudflare Email Service. */
export const outboundMessageSchema = z.object({
  from: z.email(),
  to: z.email(),
  /** Single header line — reject CR/LF to prevent header injection. */
  subject: z.string().check(z.regex(/^[^\r\n]*$/)),
  /** Plain-text body — always present for deliverability. */
  text: z.string(),
  /** Optional HTML body. */
  html: z.optional(z.string()),
});

/** Generic acknowledgement. */
export const ackSchema = z.object({ ok: z.boolean() });
