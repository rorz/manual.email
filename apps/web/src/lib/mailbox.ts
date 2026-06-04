import { env } from "cloudflare:workers";
import {
  accounts,
  addresses,
  createDb,
  type Db,
  messages,
  parseAddress,
} from "@manual.email/db";
import { desc, eq } from "drizzle-orm";
import { seedAccountDefaults } from "./defaults";

/**
 * Mailbox provisioning + lookup for the web app.
 *
 * Auth identity (BetterAuth `user`) is linked to mail (`accounts` /
 * `addresses`) purely by email: the first time we see an authenticated user's
 * address we provision an account + primary address for it. Provisioning is
 * idempotent, so the BetterAuth sign-up hook and the lazy reconciliation paths
 * in `/inbox` and `/api/send` can all call it safely under retries / races.
 */

export interface Mailbox {
  accountId: string;
  /** The canonical (lower-cased, tag-stripped) primary address. */
  address: string;
}

const db = (): Db => createDb(env.DB);

const lookup = async (d: Db, canonical: string): Promise<string | null> => {
  const rows = await d
    .select({ accountId: addresses.accountId })
    .from(addresses)
    .where(eq(addresses.address, canonical))
    .limit(1);
  return rows[0]?.accountId ?? null;
};

/**
 * Resolve the mailbox owning `email`, provisioning it on first sight. Returns
 * `null` only if the address can't be parsed.
 */
export const resolveMailbox = async (
  email: string,
): Promise<Mailbox | null> => {
  const parsed = parseAddress(email);
  if (!parsed) return null;
  const { canonical } = parsed;
  const d = db();

  const existing = await lookup(d, canonical);
  if (existing) return { accountId: existing, address: canonical };

  const accountId = `acct_${crypto.randomUUID()}`;
  await d
    .insert(accounts)
    .values({ id: accountId, displayName: null })
    .onConflictDoNothing();
  await d
    .insert(addresses)
    .values({ address: canonical, accountId, isPrimary: true })
    .onConflictDoNothing();

  // Re-read so a concurrent sign-up that won the insert race still resolves.
  const winner = await lookup(d, canonical);
  if (!winner) return null;
  // Seed the winning account's default trays/tags/filter config (idempotent).
  await seedAccountDefaults(d, winner);
  return { accountId: winner, address: canonical };
};

/** A mailbox's messages, newest first. */
export const listMessages = (accountId: string) =>
  db()
    .select()
    .from(messages)
    .where(eq(messages.accountId, accountId))
    .orderBy(desc(messages.receivedAt));
