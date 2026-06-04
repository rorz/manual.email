# Agent instructions

Conventions for any agent working in this repo.

## Project shape

Bun monorepo (`apps/*`, `packages/*`). Two Cloudflare Workers
(`ingress`, `egress`) decoupled by Cloudflare Queues; shared schema and
contracts live in `packages/*`. See `docs/architecture.md` for the full picture.

## Ground rules

- **Concise, modular, simple.** Prefer the smallest correct change. No
  speculative abstraction, no dead code, no commentary that restates the code.
- **Single source of truth.** Schema lives in `packages/db` (Drizzle); wire
  shapes live in `packages/contracts` (oRPC + `zod/mini`). Never hand-write SQL
  or duplicate a payload type in a worker — derive from these.
- **The gate is law.** `bun run check` (Biome + typecheck + Knip + pokayoke:
  350-line file ceiling, catalog dependency policy) must stay green. Run it
  before declaring work done.
- **Migrations are generated.** Edit `packages/db/src/schema.ts`, then
  `bun run db:generate`. Never hand-edit files under `packages/db/migrations`.
- **Verify Workers behaviour live**, not just by typechecking — `wrangler dev`
  plus the `apps/ingress/test` loop for inbound mail.

## Documentation

`docs/architecture.md` is the canonical description of how the system fits
together, and it must stay sharp: a tight, well-written, to-the-point account of
the architecture — never bloated, padded, or turned into a changelog. Whenever
you change the structure (add or remove a workspace, binding, queue, table,
contract, port, or alter the mail data flow), update `docs/architecture.md` in
the same change so it never drifts from reality. Treat an out-of-date or
needlessly verbose architecture doc as a defect, and fix it.
