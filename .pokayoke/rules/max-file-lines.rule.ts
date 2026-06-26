import { defineRule } from "pokayoke";

const RULE_ID = "structure/max-file-lines" as const;
const DEFAULT_MAX_LINES = 350;
const NEWLINE = 10;

interface MaxFileLinesOptions {
  readonly max?: number;
}

const sourceGlobs = [
  new Bun.Glob("apps/**/*.{css,ts,tsx}"),
  new Bun.Glob("packages/**/*.{ts,tsx}"),
  new Bun.Glob(".pokayoke/**/*.ts"),
] as const;

export const maxFileLines = defineRule<MaxFileLinesOptions>({
  meta: {
    docs: "Keep authored source files under the repo line ceiling.",
    id: RULE_ID,
    kind: "project",
  },
  async run(context) {
    const max = context.options?.max ?? DEFAULT_MAX_LINES;
    const findings = [];

    for (const file of await context.files()) {
      if (!isAuthoredSource(file)) continue;

      const lines = countNewlines(await context.readFile(file));
      if (lines <= max) continue;

      findings.push({
        advice:
          "Split the file into sibling modules, or add a top-of-file pokayoke-ignore-file with a reason.",
        file,
        line: max + 1,
        message: `File has ${lines} lines, above the configured maximum of ${max}.`,
        ruleId: RULE_ID,
        severity: "error" as const,
      });
    }

    return { findings };
  },
});

export const countNewlines = (source: string): number => {
  let count = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (source.charCodeAt(index) === NEWLINE) count += 1;
  }

  return count;
};

const isAuthoredSource = (file: string): boolean => {
  if (/\.d\.(ts|tsx)$/.test(file)) return false;
  if (/\.generated\.(ts|tsx)$/.test(file)) return false;

  return sourceGlobs.some((glob) => glob.match(file));
};
