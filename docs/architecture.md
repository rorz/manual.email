# Architecture

**manual.email is a humanist email client** — open source, calm, and built for
people rather than for engagement metrics. The product goal shapes the
engineering: mail must arrive exactly once, route predictably, and never get
silently dropped, so the system is small, legible, and unsurprising.

It is a Bun monorepo. Inbound and outbound mail are handled by two
single-purpose Cloudflare Workers, decoupled by Cloudflare Queues. Shared
schema and wire contracts live in `packages/*` so the workers never duplicate a
type or a query.

## Topology

| Workspace | Role |
| --- | --- |
| `apps/web` | Next.js 16 UI, served on Cloudflare via vinext (Vite). |
| `apps/ingress` | Receives mail (Email Routing `email()`), enqueues it, then consumes the ingress queue: idempotency → recipient resolution → route. |
| `apps/egress` | Consumes the egress queue and sends mail via the `SEND_EMAIL` binding. |
| `packages/db` | Drizzle schema (single source of truth), the typed `createDb` client, R2 key helpers, and address parsing. |
| `packages/contracts` | oRPC + `zod/mini` queue-payload contracts. The contract is the source of truth; worker message types are inferred from it. |
| `appraise` | Bun/TS guardrail enforcing the 350-line file ceiling. |

## Data flow

```mermaid
flowchart LR
  MX[Email Routing] -->|email&#40;&#41;| IN[ingress worker]
  IN -->|INGRESS_QUEUE| INQ[(manual-email-ingress)]
  INQ --> INC[ingress queue consumer]
  INC -->|EGRESS_QUEUE| EGQ[(manual-email-egress)]
  EGQ --> EG[egress worker] -->|SEND_EMAIL| OUT[outbound mail]
  INC <-->|idempotency + resolution| D1[(D1 manual-email)]
  IN -.raw MIME.-> R2[(R2 manual-email-messages)]
```

Email Routing invokes `email()` **once per recipient**, so the same message can
arrive several times with identical bytes. Each invocation enqueues, and the
queue consumer is the single chokepoint that decides what is new.

## Storage

- **D1 `manual-email`** — `accounts`, `addresses` (recipient → account
  resolution), `messages`, and `processed_messages` (the idempotency ledger).
  `apps/ingress` owns the migrations (`packages/db/migrations`); both workers
  bind the database as `DB`.
- **R2 `manual-email-messages`** — raw MIME bodies, keyed via the helpers in
  `packages/db`. Metadata stays in D1.

## Contracts & validation

`packages/contracts` defines the queue payloads once. Workers import the
**types** (erased at build time), so trusted internal queue messages carry no
runtime cost. The exception is the inbound trust boundary: `ingress.email()`
parses the constructed payload with `inboundMessageSchema` before enqueuing,
because that is the only place untrusted Email Routing data enters the system.
Schemas use `zod/mini` to keep that one bundled validator small.

## Idempotency & resolution

- **Idempotency key** is recipient-scoped: `<canonicalRecipient>|mid:<id>` or
  `<canonicalRecipient>|sha256:<body-hash>`. Scoping by recipient is essential —
  an unscoped key would drop every recipient after the first. The consumer skips
  keys already in `processed_messages` and records a key only **after** a
  terminal routing decision, so a retry re-runs rather than silently losing mail.
- **Resolution** matches the canonical recipient against `addresses`
  (first-party manual.email addresses only); `+tag` sub-addressing resolves to
  the base address.

## Ports

| Service | Dev port | Inspector |
| --- | --- | --- |
| web | 10120 | — |
| ingress | 10130 | 10131 |
| egress | 10140 | 10141 |

## Commands

- `bun run dev` — run every workspace; `dev:web` / `dev:ingress` / `dev:egress`
  for one.
- `bun run check` — the full gate: Biome + typecheck (regenerates worker types
  first) + Knip + appraise.
- `bun run db:generate` — regenerate migrations from the Drizzle schema;
  `db:migrate:local` / `db:migrate` to apply.
- Local inbound test: `apps/ingress/test/send.sh` POSTs to
  `/cdn-cgi/handler/email` (see Email Routing local-dev docs).
