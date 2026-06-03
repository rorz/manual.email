#!/usr/bin/env bun

/**
 * appraise/max-file-lines.ts
 *
 * Hard ceiling of 350 lines (matched to `wc -l` — i.e. newline count) for
 * authored source across `apps/**` and `appraise/**`. A file that crosses
 * the line is almost always telling you to split a cohesive subsystem into
 * a sibling module; do that before reaching for an opt-out.
 *
 * Generated / declaration artifacts are excluded by extension:
 *   - `*.d.ts` / `*.d.tsx`           (declaration files, usually generated)
 *   - `*.generated.{ts,tsx}`         (explicit generated marker)
 *
 * Inline opt-out — must appear within the first 10 lines so it is visible
 * to anyone opening the file:
 *
 *   // appraise-ignore: max-file-lines -- <written justification>
 *
 * CSS uses block-comment syntax for the same directive.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectFiles, hasIgnore, REPO_ROOT } from "./lib";

const MAX_LINES = 350 as const;
const OPT_OUT_SCAN_LINES = 10 as const;
const NEWLINE = 10 as const;

const SCAN_GLOBS: readonly string[] = [
  "apps/**/*.{ts,tsx,css}",
  "packages/**/*.{ts,tsx}",
  "appraise/**/*.ts",
];

const isExcludedFile = (relPath: string): boolean => {
  if (/\.d\.(ts|tsx)$/.test(relPath)) return true;
  if (/\.generated\.(ts|tsx)$/.test(relPath)) return true;
  return false;
};

/**
 * Match `wc -l` semantics: the number of newline characters in the source.
 * Content `"foo"` (no trailing newline) reports 0; a file ending in `"\n"`
 * reports its visual line count. The byte-level scan avoids allocating an
 * intermediate array of lines.
 */
const countLines = (source: string): number => {
  let count = 0;
  for (let i = 0; i < source.length; i++) {
    if (source.charCodeAt(i) === NEWLINE) count++;
  }
  return count;
};

/**
 * Whole-file opt-out: scan the first `OPT_OUT_SCAN_LINES` lines for an
 * `appraise-ignore: max-file-lines` directive. Keeping it at the top of
 * the file makes the exemption obvious to the next reader.
 */
const hasFileLevelIgnore = (source: string): boolean => {
  let scanned = 0;
  let lineStart = 0;
  while (scanned < OPT_OUT_SCAN_LINES && lineStart <= source.length) {
    const nl = source.indexOf("\n", lineStart);
    const lineEnd = nl === -1 ? source.length : nl;
    if (hasIgnore(source.slice(lineStart, lineEnd), "max-file-lines")) {
      return true;
    }
    if (nl === -1) break;
    lineStart = nl + 1;
    scanned++;
  }
  return false;
};

interface Finding {
  readonly lines: number;
  readonly relPath: string;
}

const collectFindings = async (): Promise<Finding[]> => {
  const files = await collectFiles(SCAN_GLOBS);
  const findings: Finding[] = [];

  for (const relPath of files) {
    if (isExcludedFile(relPath)) continue;

    let source: string;
    try {
      source = readFileSync(resolve(REPO_ROOT, relPath), "utf8");
    } catch {
      continue;
    }

    const lines = countLines(source);
    if (lines <= MAX_LINES) continue;
    if (hasFileLevelIgnore(source)) continue;

    findings.push({ lines, relPath });
  }

  return findings;
};

const report = (findings: readonly Finding[]): void => {
  if (findings.length === 0) {
    console.log("appraise/max-file-lines: OK");
    return;
  }

  console.error("");
  console.error(
    `appraise/max-file-lines: ${findings.length} file(s) exceed ${MAX_LINES} lines`,
  );
  console.error("");
  console.error(
    "  Split the file into sibling modules. Lift generic primitives into a",
  );
  console.error(
    "  shared library home before duplicating — a long file is a smell, but",
  );
  console.error("  duplication is worse.");
  console.error("");

  // Worst offenders first so the most painful targets are obvious.
  for (const finding of [...findings].sort((a, b) => b.lines - a.lines)) {
    console.error(`    ${finding.relPath}  ${finding.lines} lines`);
  }

  console.error("");
  console.error(
    "If a file legitimately must exceed the ceiling, add a top-of-file note:",
  );
  console.error(
    "  // appraise-ignore: max-file-lines -- <written justification>",
  );
  console.error("");
};

const findings = await collectFindings();
report(findings);
process.exit(findings.length === 0 ? 0 : 1);
