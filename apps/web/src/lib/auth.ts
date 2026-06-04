import { env } from "cloudflare:workers";
import { dash } from "@better-auth/infra";
import {
  account,
  createDb,
  session,
  user,
  verification,
} from "@manual.email/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { resolveMailbox } from "./mailbox";

/**
 * BetterAuth instance (server-only). Built lazily so `cloudflare:workers` env
 * is read on first request inside workerd rather than at module evaluation,
 * and cached for the lifetime of the isolate.
 *
 * Username+password only for now. The web app derives an `@manual.email`
 * address from the chosen username, so on sign-up we best-effort provision a
 * mailbox for that address; `/inbox` and the compose action reconcile if that
 * ever fails, so sign-up never blocks on it.
 */
const createAuth = () =>
  betterAuth({
    database: drizzleAdapter(createDb(env.DB), {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: true },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    databaseHooks: {
      user: {
        create: {
          after: async (created) => {
            try {
              await resolveMailbox(created.email);
            } catch {
              // Reconciled lazily on first authenticated read/write.
            }
          },
        },
      },
    },
    // Must be last: lets server actions persist the session cookie that
    // `auth.api.*` calls produce. The Better Auth Infrastructure dashboard
    // (analytics, audit logs, admin APIs) is enabled when an API key is
    // present — set as a secret in prod, left empty for local dev.
    plugins: [
      ...(env.BETTER_AUTH_API_KEY
        ? [dash({ apiKey: env.BETTER_AUTH_API_KEY })]
        : []),
      nextCookies(),
    ],
  });

let cached: ReturnType<typeof createAuth> | undefined;

export const getAuth = () => {
  cached ??= createAuth();
  return cached;
};
