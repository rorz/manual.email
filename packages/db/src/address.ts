/**
 * @manual.email/db — address parsing & normalisation.
 *
 * Lives next to the schema/keys so address *storage* (registration) and address
 * *lookup* (inbound resolution) always canonicalise the same way and can't
 * drift apart. Local-parts are treated case-insensitively and `+tag`
 * sub-addressing is stripped, so `Hello+receipts@Manual.Email` and
 * `hello@manual.email` resolve to the same canonical address.
 */

export interface ParsedAddress {
  /** Normalised, tag-stripped address: `local@domain`. */
  canonical: string;
  /** Tag-stripped, lower-cased local-part. */
  local: string;
  /** Lower-cased domain. */
  domain: string;
  /** The `+tag` sub-address, if any (without the `+`). */
  tag: string | null;
}

/** Parse + normalise an email address, or `null` if it isn't well-formed. */
export const parseAddress = (raw: string): ParsedAddress | null => {
  const at = raw.trim().toLowerCase();
  const split = at.lastIndexOf("@");
  if (split <= 0 || split === at.length - 1) return null;

  const rawLocal = at.slice(0, split);
  const domain = at.slice(split + 1);
  const plus = rawLocal.indexOf("+");
  const local = plus === -1 ? rawLocal : rawLocal.slice(0, plus);
  const tag = plus === -1 ? null : rawLocal.slice(plus + 1);
  if (!local || domain.includes("@")) return null;

  return { canonical: `${local}@${domain}`, domain, local, tag };
};
