/**
 * appraise/lib.ts
 *
 * Shared primitives for the appraisal scripts. Each appraisal is a
 * standalone Bun executable that reads as a single coherent check; this
 * module exists only to remove the literal duplication those checks would
 * otherwise share (the repo walker and the ignore-directive parser).
 *
 * Public surface is kept deliberately narrow — a helper with a single
 * caller stays private to that caller.
 */

import { resolve } from "node:path";
import { Glob } from "bun";

/** Absolute path to the workspace root (one level up from `appraise/`). */
export const REPO_ROOT: string = resolve(import.meta.dir, "..");

/**
 * Directory segments skipped when walking the repo: build output, caches,
 * package mirrors, and framework artifacts that are never authored by hand.
 */
const DEFAULT_SKIP_DIRS: ReadonlySet<string> = new Set<string>([
  ".next",
  ".open-next",
  ".turbo",
  ".vercel",
  ".vinext",
  ".wrangler",
  "build",
  "dist",
  "node_modules",
  "out",
]);

export interface CollectFilesOptions {
  /** Extra directory segments to skip on top of the defaults. */
  readonly skipDirs?: readonly string[];
}

/**
 * Canonical file walker. Resolves a list of Bun-style glob patterns against
 * the repo root, applies the skip-segment set, then deduplicates and sorts.
 *
 * Patterns are POSIX-style and relative to the repo root, e.g.
 * `"apps/**\/*.{ts,tsx}"`.
 */
export const collectFiles = async (
  patterns: readonly string[],
  options: CollectFilesOptions = {},
): Promise<string[]> => {
  const skip = new Set<string>([
    ...DEFAULT_SKIP_DIRS,
    ...(options.skipDirs ?? []),
  ]);

  const seen = new Set<string>();
  for (const pattern of patterns) {
    const glob = new Glob(pattern);
    for await (const file of glob.scan({ absolute: false, cwd: REPO_ROOT })) {
      if (file.split("/").some((segment) => skip.has(segment))) continue;
      seen.add(file);
    }
  }

  return [...seen].sort();
};

/**
 * Does `line` carry an `appraise-ignore: <ruleId>` directive that names
 * this rule? Accepts a comma-separated id list; any trailing justification
 * prose after the ids is ignored (but expected — see the script docs).
 */
export const hasIgnore = (line: string, ruleId: string): boolean => {
  const match = /appraise-ignore:\s*([a-z0-9-]+(?:\s*,\s*[a-z0-9-]+)*)/i.exec(
    line,
  );
  if (match === null) return false;
  const ids = match[1];
  if (ids === undefined) return false;
  return ids
    .split(",")
    .map((segment) => segment.trim().toLowerCase())
    .includes(ruleId);
};
