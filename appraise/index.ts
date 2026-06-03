#!/usr/bin/env bun

/**
 * appraise/index.ts
 *
 * Single entry point for the appraisal pack. Each appraisal is a standalone
 * Bun executable; this barrel orchestrates running them in sequence and
 * prints a unified summary. Adding a new appraisal is one line in `CHECKS` —
 * no root `package.json` edit required.
 *
 * Usage:
 *   bun run index.ts                  # run every appraisal
 *   bun run index.ts max-file-lines   # run a single appraisal
 *
 * The exit code is non-zero if any appraisal fails. Every check still runs
 * so a single sweep surfaces all issues at once.
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { REPO_ROOT } from "./lib";

const CHECKS = ["max-file-lines"] as const;

type CheckName = (typeof CHECKS)[number];

const isCheck = (value: string): value is CheckName =>
  (CHECKS as readonly string[]).includes(value);

interface CheckResult {
  readonly exitCode: number;
  readonly name: CheckName;
}

const runCheck = (name: CheckName): Promise<CheckResult> =>
  new Promise<CheckResult>((resolveCheck) => {
    const child = spawn(
      "bun",
      ["run", resolve(REPO_ROOT, "appraise", `${name}.ts`)],
      { stdio: "inherit" },
    );
    child.on("close", (code) => {
      resolveCheck({ exitCode: code ?? 1, name });
    });
  });

const requested = process.argv.slice(2);
for (const arg of requested) {
  if (!isCheck(arg)) {
    console.error(`appraise: unknown check "${arg}"`);
    console.error(`  available: ${CHECKS.join(", ")}`);
    process.exit(2);
  }
}

const toRun: readonly CheckName[] =
  requested.length > 0 ? (requested as CheckName[]) : CHECKS;

const results: CheckResult[] = [];
for (const name of toRun) {
  results.push(await runCheck(name));
}

const failed = results.filter((result) => result.exitCode !== 0);

if (failed.length > 0) {
  console.error("");
  console.error(
    `appraise: ${failed.length} of ${results.length} check(s) failed — ${failed
      .map((result) => result.name)
      .join(", ")}`,
  );
  process.exit(1);
}

console.log("");
console.log(`appraise: all ${results.length} check(s) passed`);
