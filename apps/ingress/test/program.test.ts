import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  FILTER_CONTRACT,
  MANAGED_PROGRAM,
  RUNNER,
} from "../src/filter/program";

const parentDir = fileURLToPath(
  new URL("../../../.tmp/filter-harness/", import.meta.url),
);

const input = {
  subject: "Harness",
  sender: "sender@example.com",
  body: "Plain text only",
  html: '<p data-signal="important">HTML body</p>',
};

const runProgram = async (
  source: string,
): Promise<{ error: string; verdict: unknown }> => {
  await mkdir(parentDir, { recursive: true });
  const dir = await mkdtemp(`${parentDir}run-`);
  const inputPath = `${dir}/input.json`;
  const outputPath = `${dir}/verdict.json`;
  const errorPath = `${dir}/error.txt`;

  try {
    await Bun.write(`${dir}/filter-contract.ts`, FILTER_CONTRACT);
    await Bun.write(`${dir}/main.ts`, source);
    await Bun.write(`${dir}/run.ts`, RUNNER);
    await Bun.write(inputPath, JSON.stringify(input));

    const proc = Bun.spawn(["bun", `${dir}/run.ts`], {
      cwd: dir,
      env: {
        ...process.env,
        FILTER_ERROR: errorPath,
        FILTER_INPUT: inputPath,
        FILTER_OUTPUT: outputPath,
      },
      stderr: "pipe",
      stdout: "pipe",
    });
    const exitCode = await proc.exited;
    expect(exitCode).toBe(0);

    const verdict = (await Bun.file(outputPath).exists())
      ? await Bun.file(outputPath).json()
      : null;
    const error = (await Bun.file(errorPath).exists())
      ? await Bun.file(errorPath).text()
      : "";
    return { error, verdict };
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

test("harness runs a typed custom filter program", async () => {
  const { error, verdict } =
    await runProgram(`import type { FilterProgram } from "./filter-contract.ts";

const classify: FilterProgram = async (input) => ({
  disposition: "pass",
  tags: [input.html?.includes("data-signal") ? "important" : "unimportant"],
});

export default classify;
`);

  expect(error).toBe("");
  expect(verdict).toEqual({ disposition: "pass", tags: ["important"] });
});

test("harness withholds malformed custom verdicts", async () => {
  const { error, verdict } = await runProgram(`export default async () => ({
  disposition: "pass",
  tags: ["Important"],
});
`);

  expect(verdict).toBeNull();
  expect(error).toContain("Invalid");
});

test("harness loads the managed AI SDK program", async () => {
  const { error, verdict } = await runProgram(MANAGED_PROGRAM);

  expect(verdict).toBeNull();
  expect(error).toContain("missing GEMINI_FLASH_LITE");
});
