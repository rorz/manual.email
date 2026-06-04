# Roadmap

Status of the scaffold and the work between here and a mail pipeline that
actually sends and receives. See `docs/architecture.md` for how the pieces fit;
this file is the build plan.

## Done — skeleton + safety rails

The transport and guardrails are built and verified live (idempotency + DLQ
exercised end-to-end against `wrangler dev`).

- Bun monorepo: `apps/{web,ingress,egress}`, `packages/{db,contracts}`,
  `appraise`. Names prefixed `@manual.email/*`.
- Tooling: top-level Biome, strict TS, Knip; `appraise` enforces a 350-line
  file ceiling. `bun run check` is the single gate.
- `packages/db`: Drizzle schema as the source of truth (`accounts`,
  `addresses`, `messages`, `processed_messages`, `dead_letters`), the typed
  `createDb` client, R2 key helpers, `parseAddress`. Migrations generated, not
  hand-written.
- `packages/contracts`: oRPC + `zod/mini` queue-payload contracts; worker
  message types are inferred from them.
- ingress: receives via Email Routing `email()`, computes a recipient-scoped
  idempotency key, validates at the trust boundary, enqueues. Consumer dedupes
  against `processed_messages` and resolves the recipient.
- DLQ: each worker drains its own `*-dlq` into `dead_letters`.
- Ports: web 10120, ingress 10130, egress 10140.

## Invariants (don't regress these)

- **ingress never sends mail.** It receives, persists to the mailbox, and
  decides. Anything outbound — a bounce, a forward rule — is enqueued on
  `EGRESS_QUEUE`. egress is the single egress point.
- **egress sends via Cloudflare Email Service** (`SEND_EMAIL` binding's
  structured `send({ to, from, subject, html, text })`), which delivers to
  arbitrary recipients. No manual MIME; not Email Routing's verified-only send.
- Idempotency keys are recipient-scoped; record only after a terminal decision.
- Schema and contracts are the only sources of truth — never hand-write SQL or
  duplicate a payload type.

## Missing — logic (stubbed by design)

In rough dependency order:

1. **Persist the raw inbound body.** `ingress.email()` currently enqueues only
   metadata; the MIME bytes are dropped. Store raw → R2 (key via `packages/db`)
   and carry the key on the queue payload (extend `inboundMessageSchema`).
2. **Deliver to the mailbox.** For a resolved recipient, write a `messages` row
   (+ the R2 key) so it shows up in the client. Filtering/sorting/threading
   live here.
3. **Bounce unresolved recipients.** Enqueue a bounce on `EGRESS_QUEUE` (ingress
   never sends directly).
4. **Forward rules.** When a delivered message matches a forward rule, enqueue
   the forward on `EGRESS_QUEUE`.
5. **egress `send()`.** Build the Email Service payload from the queue message
   and call `env.SEND_EMAIL.send(...)`; handle the `EmailSendResult` / errors.
6. **Account + address seeding.** Nothing populates `accounts`/`addresses`, so
   every recipient currently resolves to nothing. Needs a registration path
   (and the egress queue producer wired from the web app for composed mail).
7. **web UI.** Read mailbox from D1/R2; compose → `EGRESS_QUEUE`.

## Missing — provisioning / config

- Replace the placeholder `database_id` (`00000000-…`) in both wranglers with
  the real ID from `wrangler d1 create manual-email`.
- Create resources: D1 `manual-email`, R2 `manual-email-messages`, and the four
  queues (`manual-email-{ingress,egress}` + their `-dlq`).
- Apply migrations remotely (`bun run db:migrate`).
- Enable **Cloudflare Email Service** (beta, Workers Paid) and verify the
  sending domain for egress.
- Configure **Email Routing**: MX records for `manual.email` + a rule routing
  inbound mail to the ingress Worker. Until this exists, `email()` is never
  invoked in production.

## Open decisions

- **Replay path** for `dead_letters` (re-enqueue to the origin queue). Currently
  retain + inspect only; replay deferred.
- **Catch-all / multi-tenant addressing.** Deferred — first-party
  `manual.email` addresses only for now.

## Backlog (lower priority)

- CI running `bun run check`; an automated test layer (vitest-pool-workers) to
  replace the manual `apps/ingress/test` smoke loop.
- egress secrets/config posture once a real sender domain exists.
- Pin the Bun version (`.bun-version` / `engines`).
