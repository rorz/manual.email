import { env } from "cloudflare:workers";
import { dash } from "@better-auth/infra";
import {
  account,
  createDb,
  normalizeInviteCode,
  redeemInviteCode,
  releaseInviteCode,
  reserveInviteCode,
  session,
  user,
  verification,
} from "@manual.email/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { resolveMailbox } from "./mailbox";

/**
 * BetterAuth instance (server-only). Built lazily so `cloudflare:workers` env
 * is read on first request inside workerd rather than at module evaluation,
 * and cached for the lifetime of the isolate.
 *
 * Username+password only for now. The web app derives an `@manual.email`
 * address from the chosen username. Sign-up is invite-only: the auth hook
 * reserves an invite before BetterAuth creates the user, then redeems it once
 * BetterAuth returns that user.
 */
const inviteOnlyError = (message: string) =>
  APIError.from("BAD_REQUEST", {
    code: "INVITE_CODE_INVALID",
    message,
  });

const inviteCodeFromBody = (body: unknown): string | null => {
  if (!(body && typeof body === "object")) return null;
  const raw = (body as { inviteCode?: unknown }).inviteCode;
  return typeof raw === "string" ? normalizeInviteCode(raw) : null;
};

const userIdFromReturned = (returned: unknown): string | null => {
  if (!(returned && typeof returned === "object")) return null;
  const user = (returned as { user?: unknown }).user;
  if (!(user && typeof user === "object")) return null;
  const id = (user as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
};

const createAuth = () =>
  betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(createDb(env.DB), {
      provider: "sqlite",
      schema: { account, session, user, verification },
    }),
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
    emailAndPassword: { enabled: true },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const code = inviteCodeFromBody(ctx.body);
        if (!code) return;
        const userId = userIdFromReturned(ctx.context.returned);
        if (userId) {
          await redeemInviteCode(createDb(env.DB), code, userId);
        } else {
          await releaseInviteCode(createDb(env.DB), code);
        }
      }),
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const code = inviteCodeFromBody(ctx.body);
        if (!code) {
          throw inviteOnlyError("New signups are invite only for now.");
        }
        const reserved = await reserveInviteCode(createDb(env.DB), code);
        if (!reserved) {
          throw inviteOnlyError("Invite code is invalid or already used.");
        }
        ctx.body.inviteCode = code;
      }),
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
    secret: env.BETTER_AUTH_SECRET,
  });

let cached: ReturnType<typeof createAuth> | undefined;

export const getAuth = () => {
  cached ??= createAuth();
  return cached;
};
