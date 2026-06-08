import { describe, expect, test } from "bun:test";
import type { RuleContext } from "pokayoke";

import { countNewlines, maxFileLines } from "./max-file-lines.rule";

describe("structure/max-file-lines", () => {
  test("matches wc -l newline counting", () => {
    expect(countNewlines("one")).toBe(0);
    expect(countNewlines("one\n")).toBe(1);
    expect(countNewlines("one\ntwo\n")).toBe(2);
  });

  test("reports oversized authored source files", async () => {
    const context = createContext({
      files: ["apps/web/src/app/page.tsx", "docs/architecture.md"],
      sources: {
        "apps/web/src/app/page.tsx": "\n".repeat(351),
        "docs/architecture.md": "\n".repeat(800),
      },
      options: { max: 350 },
    });

    const result = await maxFileLines.run(context);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.file).toBe("apps/web/src/app/page.tsx");
  });

  test("ignores generated and declaration files", async () => {
    const context = createContext({
      files: [
        "packages/db/src/types.generated.ts",
        "packages/db/src/types.d.ts",
      ],
      sources: {
        "packages/db/src/types.generated.ts": "\n".repeat(351),
        "packages/db/src/types.d.ts": "\n".repeat(351),
      },
      options: { max: 350 },
    });

    const result = await maxFileLines.run(context);

    expect(result.findings).toHaveLength(0);
  });
});

const createContext = ({
  files,
  options,
  sources,
}: {
  readonly files: string[];
  readonly options: { readonly max: number };
  readonly sources: Record<string, string>;
}): RuleContext<{ readonly max: number }> => ({
  files: async () => files,
  fix: false,
  glob: async () => [],
  options,
  packageJson: async () => ({}),
  parseTypescript: async () => {
    throw new Error("parseTypescript is not used by this rule.");
  },
  readFile: async (file) => sources[file] ?? "",
  report: () => {},
  root: "",
  workspaces: async () => [],
});
