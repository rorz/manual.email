import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — schema-as-code for the shared D1 database.
 *
 * `drizzle-kit generate` derives SQL migrations into `./migrations` from
 * `src/schema.ts`. Those migrations are applied with the D1-native tooling
 * (`wrangler d1 migrations apply`), so no Cloudflare credentials are needed
 * to generate them.
 *
 * For `drizzle-kit push`/`studio` against a remote D1 you'd additionally set
 * `driver: "d1-http"` + `dbCredentials` (account id / database id / token).
 */
export default defineConfig({
  dialect: "sqlite",
  out: "./migrations",
  schema: "./src/schema.ts",
  strict: true,
  verbose: true,
});
