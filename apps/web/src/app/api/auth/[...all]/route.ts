import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

/**
 * The Better Auth HTTP API, mounted at `/api/auth/*`. The app authenticates via
 * server actions, but external clients (mobile, the hosted dashboard, OpenAPI
 * tooling) need the standard HTTP handler too. `getAuth` is resolved per request
 * so `cloudflare:workers` env is read inside the isolate, not at module load.
 */
export const { GET, POST } = toNextJsHandler((request) =>
  getAuth().handler(request),
);
