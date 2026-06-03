/**
 * @manual.email/db — Drizzle client over a D1 binding.
 *
 * The single typed entry point for runtime reads/writes. Queries built from
 * this client are derived from the schema in `./schema`, so table/column names
 * and row types can't drift from the migrations Drizzle generates. The
 * `AnyD1Database` input degrades gracefully whether the caller has Workers or
 * Miniflare D1 types in scope.
 */

import { type AnyD1Database, drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const createDb = (d1: AnyD1Database) => drizzle(d1, { schema });

export type Db = ReturnType<typeof createDb>;
