/**
 * @manual.email/db — public surface.
 *
 * Shared, framework-agnostic database contracts for the monorepo: the Drizzle
 * schema + inferred row types (`./schema`) and R2 object-key helpers
 * (`./keys`). Migrations in `../migrations` are generated from the schema via
 * `drizzle-kit generate` and applied per-Worker with
 * `wrangler d1 migrations apply`.
 */

export * from "./address";
export * from "./client";
export * from "./keys";
export * from "./schema";
