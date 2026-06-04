/**
 * Runs a filter program inside the Sandbox and returns its raw verdict output.
 *
 * The same harness drives both modes ("same pipes"): write `main.ts` (the
 * managed source or the user's custom source), `run.ts` (the fixed harness),
 * and `input.json`, then `bun run` it and read back the verdict file. Each
 * invocation uses a fresh directory so nothing leaks between messages.
 *
 * Isolation: managed and custom runs use **different sandbox ids**, so a
 * custom program can never share a container with — and observe the
 * `GEMINI_FLASH_LITE` of — a managed run. Custom runs are given no first-party
 * secrets at all.
 *
 * Transport failures (container unreachable, exec error) propagate; the caller
 * treats them as retryable infrastructure errors, never a terminal verdict.
 */

import { getSandbox } from "@cloudflare/sandbox";
import type { FilterInput } from "@manual.email/contracts";
import type { FilterMode } from "@manual.email/db";
import { FILTER_CONTRACT, MANAGED_PROGRAM, RUNNER } from "./program";

/** The program to run, resolved from an account's `filter_configs` row. */
export interface FilterProgram {
  mode: FilterMode;
  safetyPrompt: string;
  tagPrompt: string;
  customSource: string | null;
}

/** Hard ceiling on a single program run. */
const TIMEOUT_MS = 15_000;

export const runFilter = async (
  binding: Parameters<typeof getSandbox>[0],
  accountId: string,
  program: FilterProgram,
  input: FilterInput,
  geminiKey: string,
): Promise<string> => {
  const sandbox = getSandbox(binding, `${program.mode}:${accountId}`);
  const dir = `/work/${crypto.randomUUID()}`;
  const main =
    program.mode === "custom" ? (program.customSource ?? "") : MANAGED_PROGRAM;

  await sandbox.mkdir(dir, { recursive: true });
  await sandbox.writeFile(`${dir}/filter-contract.ts`, FILTER_CONTRACT);
  await sandbox.writeFile(`${dir}/main.ts`, main);
  await sandbox.writeFile(`${dir}/run.ts`, RUNNER);
  await sandbox.writeFile(`${dir}/input.json`, JSON.stringify(input));

  const env: Record<string, string> = {
    FILTER_ERROR: `${dir}/error.txt`,
    FILTER_INPUT: `${dir}/input.json`,
    FILTER_OUTPUT: `${dir}/verdict.json`,
  };
  if (program.mode === "managed") {
    env["GEMINI_FLASH_LITE"] = geminiKey;
    env["SAFETY_PROMPT"] = program.safetyPrompt;
    env["TAG_PROMPT"] = program.tagPrompt;
  }

  await sandbox.exec(`bun ${dir}/run.ts`, { env, timeout: TIMEOUT_MS });

  try {
    const file = await sandbox.readFile(`${dir}/verdict.json`);
    return file.content;
  } catch {
    // No verdict file — the program threw or wrote nothing. The caller's
    // mode-aware policy decides whether that quarantines or retries.
    return "";
  }
};
