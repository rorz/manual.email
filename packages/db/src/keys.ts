/**
 * @manual.email/db — R2 object-key helpers.
 *
 * Raw message bodies and attachments are stored in a single R2 bucket. These
 * helpers centralise the key layout so producers (ingress/egress) and
 * consumers (web) never hand-format keys and can't drift apart.
 *
 * The owning account is resolved at the inbound trust boundary
 * (`ingress.email()`), so the body is written straight under its account
 * prefix; mail for an unknown recipient lands under a shared `unresolved/`
 * prefix instead (see `unresolvedBodyKey`).
 *
 * Layout:
 *   messages/<accountId>/<messageId>.eml            — raw RFC822 body
 *   messages/<accountId>/<messageId>/att/<id>       — a decoded attachment
 *   unresolved/<messageId>.eml                      — body for an unknown rcpt
 */

/** R2 key for a message's raw RFC822 body. */
export const messageBodyKey = (accountId: string, messageId: string): string =>
  `messages/${accountId}/${messageId}.eml`;

/** R2 key for the raw body of a message whose recipient didn't resolve. */
export const unresolvedBodyKey = (messageId: string): string =>
  `unresolved/${messageId}.eml`;

/** R2 key prefix for everything belonging to a single message. */
export const messagePrefix = (accountId: string, messageId: string): string =>
  `messages/${accountId}/${messageId}/`;

/** R2 key for a single decoded attachment of a message. */
export const attachmentKey = (
  accountId: string,
  messageId: string,
  attachmentId: string,
): string => `messages/${accountId}/${messageId}/att/${attachmentId}`;
