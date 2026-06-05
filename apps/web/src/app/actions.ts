"use server";

import { env } from "cloudflare:workers";
import {
  composeRequestSchema,
  outboundMessageSchema,
} from "@manual.email/contracts";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { saveCustomFilter, saveManagedFilter } from "@/lib/filter-preferences";
import {
  createTray,
  deleteTray,
  resolveMailbox,
  updateTray,
} from "@/lib/mailbox";

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
const usernameToEmail = (raw: string): string | null => {
  const username = raw.trim().toLowerCase();
  return USERNAME.test(username) ? `${username}@${MAIL_DOMAIN}` : null;
};

/** Sign in or sign up (branch on the form's `mode`), then land on the inbox. */
export const authenticate = async (
  _prev: AuthState,
  form: FormData,
): Promise<AuthState> => {
  const mode = form.get("mode");
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const inviteCode = String(form.get("inviteCode") ?? "");

  const email = usernameToEmail(username);
  if (!email) {
    return {
      error:
        "Username may use letters, numbers, dots, hyphens and underscores.",
    };
  }

  try {
    if (mode === "sign-up") {
      const body = {
        email,
        inviteCode,
        name: username.trim().toLowerCase(),
        password,
      };
      await getAuth().api.signUpEmail({
        headers: await headers(),
        body,
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
};

/** End the session and return to the splash. */
export const signOut = async (): Promise<void> => {
  await getAuth().api.signOut({ headers: await headers() });
  redirect("/");
};

export interface SendState {
  status?: string;
}

const currentMailbox = async () => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  return resolveMailbox(session.user.email);
};

const trayAppearance = (form: FormData) => ({
  color: String(form.get("color") ?? ""),
  icon: String(form.get("icon") ?? ""),
});

/** Validate a composed message and enqueue it to egress (from = session). */
export const sendMessage = async (
  _prev: SendState,
  form: FormData,
): Promise<SendState> => {
  const parsed = composeRequestSchema.safeParse({
    to: form.get("to"),
    subject: form.get("subject"),
    text: form.get("text"),
  });
  if (!parsed.success) return { status: "Invalid message" };

  const mailbox = await currentMailbox();
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
};

export const createTrayAction = async (form: FormData): Promise<void> => {
  const mailbox = await currentMailbox();
  if (!mailbox) return;
  await createTray(
    mailbox.accountId,
    String(form.get("name") ?? ""),
    form.getAll("tagId").map(String),
    trayAppearance(form),
  );
  revalidatePath("/inbox");
  revalidatePath("/preferences");
};

export const updateTrayAction = async (form: FormData): Promise<void> => {
  const mailbox = await currentMailbox();
  if (!mailbox) return;
  await updateTray(
    mailbox.accountId,
    String(form.get("trayId") ?? ""),
    String(form.get("name") ?? ""),
    form.getAll("tagId").map(String),
    trayAppearance(form),
  );
  revalidatePath("/inbox");
  revalidatePath("/preferences");
};

export const deleteTrayAction = async (form: FormData): Promise<void> => {
  const mailbox = await currentMailbox();
  if (!mailbox) return;
  await deleteTray(mailbox.accountId, String(form.get("trayId") ?? ""));
  revalidatePath("/inbox");
  revalidatePath("/preferences");
};

export const updateManagedFilterAction = async (
  form: FormData,
): Promise<void> => {
  const mailbox = await currentMailbox();
  if (!mailbox) return;
  await saveManagedFilter(
    mailbox.accountId,
    String(form.get("safetyPrompt") ?? ""),
    String(form.get("tagPrompt") ?? ""),
  );
  revalidatePath("/preferences");
};

export const updateCustomFilterAction = async (
  form: FormData,
): Promise<void> => {
  const mailbox = await currentMailbox();
  if (!mailbox) return;
  await saveCustomFilter(
    mailbox.accountId,
    String(form.get("customSource") ?? ""),
  );
  revalidatePath("/preferences");
};
