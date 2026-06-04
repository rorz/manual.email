/**
 * @manual.email/db — schema as code (Drizzle / D1).
 *
 * The single source of truth for the relational core: accounts, address
 * resolution, and message metadata. `drizzle-kit generate` derives the SQL
 * migrations in `../migrations` from these definitions, and the inferred
 * `$inferSelect`/`$inferInsert` types below are reused across Workers and
 * the web app.
 *
 * Raw RFC822 bodies + attachments live in R2 — a row points at them via
 * `r2Key` (see `./keys`).
 */

import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// BetterAuth's core tables live alongside the mail core in the same D1, so
// drizzle-kit (which reads only this file) emits one migration set for both.
export * from "./auth-schema";

const createdAt = () =>
  integer("created_at").notNull().default(sql`(unixepoch() * 1000)`);

/** A platform account (a user / mailbox owner). */
export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  createdAt: createdAt(),
});

/**
 * Account resolution: a fully-qualified, lower-cased address (primary or
 * alias) → the owning account. Inbound routing resolves recipients here.
 */
export const addresses = sqliteTable(
  "addresses",
  {
    address: text("address").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    isPrimary: integer("is_primary", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: createdAt(),
  },
  (t) => [index("idx_addresses_account").on(t.accountId)],
);

/** Message metadata. The raw bytes live in R2 at `r2Key`. */
export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    direction: text("direction", {
      enum: ["inbound", "outbound"],
    }).notNull(),
    messageId: text("message_id"),
    inReplyTo: text("in_reply_to"),
    threadId: text("thread_id"),
    mailFrom: text("mail_from").notNull(),
    rcptTo: text("rcpt_to").notNull(),
    subject: text("subject"),
    sizeBytes: integer("size_bytes").notNull(),
    r2Key: text("r2_key").notNull(),
    folder: text("folder", {
      enum: ["inbox", "sent", "archive", "spam", "trash"],
    })
      .notNull()
      .default("inbox"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    isStarred: integer("is_starred", { mode: "boolean" })
      .notNull()
      .default(false),
    receivedAt: integer("received_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("idx_messages_account_received").on(t.accountId, t.receivedAt),
    index("idx_messages_thread").on(t.threadId),
  ],
);

/**
 * Idempotency ledger: keys of inbound messages ingress has fully processed, so
 * queue retries / Email Routing redeliveries are dropped, not reprocessed.
 */
export const processedMessages = sqliteTable("processed_messages", {
  key: text("key").primaryKey(),
  seenAt: integer("seen_at").notNull(),
});

/**
 * Dead-letter store: messages a queue consumer failed to process after its
 * retries were exhausted. Each worker drains its own DLQ into this table so a
 * code-path failure quarantines mail for inspection / replay instead of
 * silently dropping it. `body` is the JSON queue payload.
 */
export const deadLetters = sqliteTable("dead_letters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  queue: text("queue").notNull(),
  body: text("body").notNull(),
  failedAt: integer("failed_at").notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type DeadLetter = typeof deadLetters.$inferSelect;
export type NewDeadLetter = typeof deadLetters.$inferInsert;

/** Direction of a stored message relative to the platform. */
export type MailDirection = Message["direction"];

/** Mailbox folder a message currently lives in. */
export type MailFolder = Message["folder"];
