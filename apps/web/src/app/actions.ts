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

/** Sign in or sign up (branch on the form's `mode`), then land on the inbox. */
export async function authenticate(
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> {
  const mode = form.get("mode");
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const name = String(form.get("name") ?? "");

  try {
    if (mode === "sign-up") {
      await getAuth().api.signUpEmail({
        headers: await headers(),
        body: { name, email, password },
      });
    } else {
      await getAuth().api.signInEmail({
        headers: await headers(),
        body: { email, password },
      });
    }
  } catch (error) {
    if (error instanceof APIError) return { error: error.message };
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
