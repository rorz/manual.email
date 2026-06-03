# manual.email

A Bun-managed monorepo.

## Layout

| Path | Stack | Purpose |
| --- | --- | --- |
| [`apps/web`](apps/web) | Next.js 16 (App Router) on [vinext](https://github.com/cloudflare/vinext) / Vite 8 | Web interface |
| [`apps/ingress`](apps/ingress) | Cloudflare Worker | Inbound email routing, queueing, filtering & sorting |
| [`apps/egress`](apps/egress) | Cloudflare Worker | Outbound email sending |
| [`packages/db`](packages/db) | [Drizzle](https://orm.drizzle.team) → D1 (SQLite) + R2 | Schema-as-code, inferred row types, R2 key helpers & generated migrations |
| [`packages/contracts`](packages/contracts) | [oRPC](https://orpc.unnoq.com) + Zod 4 | Contract-first schemas; queue payload types shared by the workers |
| [`appraise`](appraise) | Bun + low-level TS | Repo-grown quality checks (e.g. 350-line file ceiling) |

## Tooling

- **[Biome](https://biomejs.dev)** — formatter + linter (replaces ESLint/Prettier). Config: [`biome.jsonc`](biome.jsonc).
- **[Knip](https://knip.dev)** — unused files / exports / dependencies, all issue types set to `error`. Config: [`knip.jsonc`](knip.jsonc).
- **[`appraise/`](appraise)** — bespoke Bun checks; currently a hard 350-LoC-per-file ceiling.
- **TypeScript** — a strict shared base in [`tsconfig.base.json`](tsconfig.base.json) (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noUnusedLocals`/`Parameters`, …).

## Storage

The relational core lives in **D1** (SQLite) and raw message bytes in **R2**.
The D1 schema is **defined as code with [Drizzle](https://orm.drizzle.team)**
in [`packages/db`](packages/db) — `drizzle-kit generate` derives the SQL
migrations, and `wrangler` applies them (D1-native migration tracking):

- **D1** (`DB` binding) — accounts, address resolution, message metadata.
- **R2** (`MESSAGES_BUCKET` binding) — raw RFC822 bodies & attachments.

```sh
bun run db:generate       # schema change -> new migration in packages/db
bun run db:migrate:local  # apply to local D1 (miniflare)
bun run db:migrate        # apply to remote D1 (needs the real database_id)
```

`ingress` and `egress` declare both bindings in their `wrangler.jsonc`;
**ingress owns the migrations** (`migrations_dir` + the `db:migrate*` scripts).
The `web` app binds the same resources at deploy time — `vinext deploy`
auto-generates its `wrangler.jsonc`/`vite.config.ts`, and the bindings get
added to that generated file (hand-authoring web's `wrangler.jsonc` forces a
Workers build that needs the `cloudflare()` Vite plugin).

Set the real D1 id (`wrangler d1 create manual-email`) in each `wrangler.jsonc`
before deploying — see [`packages/db`](packages/db/README.md).

## Idempotency

Every inbound message carries a stable, **recipient-scoped `idempotencyKey`**
(`<recipient>|mid:…` or `<recipient>|sha256:…`). It's scoped by recipient
because Email Routing invokes the handler once per recipient with the same
Message-ID/bytes — an unscoped key would drop the message for every recipient
after the first. The ingress queue consumer is the single chokepoint: it skips
any key already in the `processed_messages` D1 ledger, and only records a key
**after** a terminal routing decision is made — so a retry re-runs rather than
silently dropping mail. This absorbs both Cloudflare Queues' at-least-once
retries and Email Routing redeliveries.

All worker D1 access goes through the Drizzle client (`createDb` in
`packages/db`), so runtime queries are schema-derived and can't drift from the
migrations.

Inbound recipients are resolved to a platform account by exact match against
the registered `addresses` table (first-party `manual.email` addresses only),
canonicalised so `+tag` sub-addressing resolves to the base address.

### Testing email locally

Cloudflare exposes a local `/cdn-cgi/handler/email` endpoint under `wrangler dev`
([docs](https://developers.cloudflare.com/email-routing/email-workers/local-development/)):

```sh
bun run db:migrate:local                 # ensure the local D1 schema exists
bun --filter @manual.email/ingress dev   # ingress on :10130 (queue + D1 local)
./apps/ingress/test/send.sh              # POSTs test/sample.eml twice
```

The fixed `Message-ID` in `sample.eml` means the second delivery is skipped —
`processed_messages` ends with exactly one row.

## Requirements

- [Bun](https://bun.sh) `>= 1.3`
- A Cloudflare account (for deploying the workers and `web`)

## Getting started

```bash
bun install
```

### Develop

Run everything at once (each app's logs are prefixed):

```bash
bun run dev          # web + ingress + egress in parallel
bun run dev:workers  # ingress + egress only
```

Or run a single app:

```bash
bun run dev:web       # Next.js (vinext) dev server  → http://localhost:10120
bun run dev:ingress   # ingress worker (wrangler dev) → http://localhost:10130
bun run dev:egress    # egress worker  (wrangler dev) → http://localhost:10140
```

> Workers use fixed ports so they can run side by side: ingress on `10130`
> (inspector `10131`), egress on `10140` (inspector `10141`). The workers
> respond `500` to a plain `GET /` because they only expose `email`/`queue`
> handlers, not `fetch` — that's expected.

### Quality

```bash
bun run check        # biome + typecheck + knip + appraise (the full gate)
bun run lint         # biome check (lint + format diagnostics)
bun run lint:fix     # biome check --write (autofix + format)
bun run format       # biome format --write
bun run knip         # unused files / exports / deps
bun run appraise     # run all appraise (350-line ceiling, …)
bun run typecheck    # tsc across all workspaces
bun run cf-typegen   # regenerate worker binding types after editing wrangler.jsonc
bun run build        # build all apps
```

### Deploy

```bash
bun run deploy           # deploy all three
bun run deploy:web
bun run deploy:ingress
bun run deploy:egress
```

> This is a structural scaffold only — handlers are stubs to be fleshed out.
