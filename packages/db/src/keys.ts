/**
 * @manual.email/db — R2 object-key helpers.
 *
 * Raw message bodies and attachments are stored in a single R2 bucket. These
 * helpers centralise the key layout so producers (ingress/egress) and
 * consumers (web) never hand-format keys and can't drift apart.
 *
 * Layout:
 *   messages/<accountId>/<messageId>.eml            — raw RFC822 body
 *   messages/<accountId>/<messageId>/att/<id>       — a decoded attachment
 */

/** R2 key for a message's raw RFC822 body. */
export const messageBodyKey = (accountId: string, messageId: string): string =>
  `messages/${accountId}/${messageId}.eml`;

/** R2 key prefix for everything belonging to a single message. */
export const messagePrefix = (accountId: string, messageId: string): string =>
  `messages/${accountId}/${messageId}/`;

/** R2 key for a single decoded attachment of a message. */
export const attachmentKey = (
  accountId: string,
  messageId: string,
  attachmentId: string,
): string => `messages/${accountId}/${messageId}/att/${attachmentId}`;
