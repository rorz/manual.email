/**
 * @manual.email/db — BetterAuth core tables (Drizzle / D1).
 *
 * Hand-mirrored from BetterAuth's canonical core schema (user / session /
 * account / verification) so the web app's auth lives in the same D1 + Drizzle
 * source of truth as the mail core. BetterAuth's drizzle adapter resolves each
 * field to the table property of the **same name**, so these properties stay
 * camelCase (matching BetterAuth's field names) while the SQL columns keep the
 * repo's snake_case convention.
 *
 * These tables only carry authentication. A mailbox (`accounts` + `addresses`)
 * is provisioned from a `user` on sign-up via the web app's auth
 * `databaseHooks`, linking auth identity to mail by email address.
 */

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () => integer("created_at", { mode: "timestamp" }).notNull();
const updatedAt = () => integer("updated_at", { mode: "timestamp" }).notNull();

/** An authenticated person. */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A login session, keyed by an opaque bearer token. */
export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

/** Credentials / linked provider for a user (email+password lives here). */
export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Short-lived verification tokens (email verify, password reset, …). */
export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
