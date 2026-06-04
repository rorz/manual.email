/**
 * Interpreting a program's output into a verdict, with a mode-aware failure
 * policy.
 *
 * The Sandbox runner writes the verdict to a file; this reads that raw string
 * and validates it against the contract. The failure policy is the safety crux:
 *
 *  - A valid verdict is used as-is (both modes).
 *  - Otherwise the outcome depends on **why** the program is the authority:
 *    - **custom** — the program is the user's sender-facing contract. Failing
 *      to emit structured output is a real (if blunt) decision: fail-closed to
 *      Quarantine, never silently pass.
 *    - **managed** — a missing verdict means *our* program/infra failed, so we
 *      throw. The queue retries and, if exhausted, the message lands in the DLQ
 *      for inspection rather than being mislabelled as spam.
 *
 * Genuine infrastructure errors (Sandbox unreachable, R2 read failure) throw
 * from the executor before we ever get here, so they retry too — they are never
 * turned into a terminal reject.
 */

import {
  type FilterVerdict,
  filterVerdictSchema,
} from "@manual.email/contracts";
import type { FilterMode } from "@manual.email/db";

/** Thrown when a managed run can't reach a verdict for an infrastructural
 *  reason. Propagates so the queue retries instead of quarantining the sender. */
class FilterUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilterUnavailableError";
  }
}

const QUARANTINE: FilterVerdict = {
  disposition: "reject",
  category: "other",
  reason: "Filter program did not return a valid verdict.",
};

/** Turn the raw verdict-file contents into a verdict, applying the failure
 *  policy above. Throws `FilterUnavailableError` for a managed non-verdict. */
export function interpretOutput(mode: FilterMode, raw: string): FilterVerdict {
  const verdict = parseVerdict(raw);
  if (verdict) return verdict;
  if (mode === "custom") return QUARANTINE;
  throw new FilterUnavailableError(
    "Managed filter program produced no valid verdict.",
  );
}

function parseVerdict(raw: string): FilterVerdict | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const result = filterVerdictSchema.safeParse(json);
  return result.success ? result.data : null;
}
