"use server";

import { env } from "cloudflare:workers";
import {
  composeRequestSchema,
  outboundMessageSchema,
} from "@manual.email/contracts";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { resolveMailbox } from "@/lib/mailbox";

/**
 * Server actions — the only way the web app mutates auth/mail state. There are
 * no HTTP API routes; forms post straight to these.
 */

export interface AuthState {
  error?: string;
}

/**
 * The mail domain every account lives under. A username is the local-part of
 * the user's first-party address, so identity and mailbox are one and the same:
 * sign up as `alice` and your address is `alice@manual.email`.
 */
const MAIL_DOMAIN = "manual.email";

/** Allowed username shape — a clean, tag-free email local-part. */
const USERNAME = /^[a-z0-9]+([._-][a-z0-9]+)*$/;

/** Map a username to its derived address, or `null` if it isn't well-formed. */
function usernameToEmail(raw: string): string | null {
  const username = raw.trim().toLowerCase();
  return USERNAME.test(username) ? `${username}@${MAIL_DOMAIN}` : null;
}

/** Sign in or sign up (branch on the form's `mode`), then land on the inbox. */
export async function authenticate(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const mode = form.get("mode");
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");

  const email = usernameToEmail(username);
  if (!email) {
    return {
      error:
        "Username may use letters, numbers, dots, hyphens and underscores.",
    };
  }

  try {
    if (mode === "sign-up") {
      await getAuth().api.signUpEmail({
        headers: await headers(),
        body: { name: username.trim().toLowerCase(), email, password },
      });
    } else {
      await getAuth().api.signInEmail({
        headers: await headers(),
        body: { email, password },
      });
    }
  } catch (error) {
    // BetterAuth speaks "email"; users here only ever see a username.
    if (error instanceof APIError) {
      return { error: error.message.replace(/email/gi, "username") };
    }
    throw error;
  }

  redirect("/inbox");
}

/** End the session and return to the splash. */
export async function signOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
}

export interface SendState {
  status?: string;
}

/** Validate a composed message and enqueue it to egress (from = session). */
export async function sendMessage(
  _prev: SendState,
  form: FormData,
): Promise<SendState> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return { status: "Not signed in" };

  const parsed = composeRequestSchema.safeParse({
    to: form.get("to"),
    subject: form.get("subject"),
    text: form.get("text"),
  });
  if (!parsed.success) return { status: "Invalid message" };

  const mailbox = await resolveMailbox(session.user.email);
  if (!mailbox) return { status: "No mailbox" };

  const { to, subject, text, html } = parsed.data;
  const outbound = outboundMessageSchema.parse({
    from: mailbox.address,
    to,
    subject,
    text,
    ...(html !== undefined ? { html } : {}),
  });

  await env.EGRESS_QUEUE.send(outbound);
  return { status: "Queued" };
}
