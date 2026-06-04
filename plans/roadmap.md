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

1. ✅ **Persist the raw inbound body.** `email()` resolves the recipient, streams
   the raw MIME to R2 (`messages/<accountId>/…` or `unresolved/…`), and carries a
   deterministic id + the R2 key + extracted headers on `inboundMessageSchema`.
2. ✅ **Deliver to the mailbox.** The consumer writes a `messages` row (inbound,
   inbox, R2 key, minimal `In-Reply-To` threading) for a resolved recipient,
   idempotent under retries via the deterministic id + `onConflictDoNothing`.
3. **Bounce unresolved recipients.** Enqueue a bounce on `EGRESS_QUEUE` (ingress
   never sends directly). Deferred — handled alongside the rules rework; the
   unresolved body is currently parked under `unresolved/` and left.
4. **Forward rules.** When a delivered message matches a forward rule, enqueue
   the forward on `EGRESS_QUEUE`. Deferred — part of the rules rework.
5. ✅ **egress `send()`.** The consumer builds the Email Service payload from the
   queue message and calls `env.SEND_EMAIL.send({ from, to, subject, text, html })`,
   acking on success and retrying (then DLQ) on a thrown error. Outbound contract
   carries `text` (required) + `html` (optional).
6. ✅ **Account + address seeding.** Seeding: `apps/ingress/scripts/seed.ts`
   (`bun run --filter @manual.email/ingress seed -- [--name <n>] [--remote] <addr>…`)
   canonicalises via `parseAddress` and writes an account + its address(es), so
   recipients resolve. Producer: `apps/web` is now a vinext Worker
   (`wrangler.jsonc` + `vite.config.ts` with `@cloudflare/vite-plugin`) that
   produces to the `EGRESS_QUEUE` binding via `import { env } from "cloudflare:workers"`.
7. ✅ **web UI.** BetterAuth email+password sign-in on the shared D1 (Drizzle
   adapter; tables in `packages/db`). A `/` splash + protected `/inbox`
   (list-from-D1 + compose). Every mutation is a **server action** — no API
   routes. Sign-up auto-provisions the mailbox (`accounts` + primary `addresses`)
   from the user's email and compose derives `from` from the session. Skeleton
   only; styling is owned downstream.

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
- **Compose hardening before public launch:** auth + server-derived `from` are
  done (compose requires a session and ignores any client `from`). Still open:
  add size caps to `outboundMessageSchema` (`subject`/`text`/`html`) aligned to
  Queues/Email Service limits; add outbound idempotency so an at-least-once
  egress retry can't double-send.
