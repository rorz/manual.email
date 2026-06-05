import { describe, expect, test } from "bun:test";
import type { RuleContext } from "pokayoke";

import { detectBucketViolations, uiSourceBuckets } from "./ui-source-buckets";

describe("ui/source-buckets", () => {
  test("allows primitives, composites, utils, and the root barrel", () => {
    const files = [
      "packages/ui/src/index.ts",
      "packages/ui/src/primitives/button.tsx",
      "packages/ui/src/primitives/index.ts",
      "packages/ui/src/composites/field.tsx",
      "packages/ui/src/composites/index.ts",
      "packages/ui/src/utils/cn.ts",
      "packages/ui/src/utils/index.ts",
    ];

    expect(files.flatMap(detectBucketViolations)).toHaveLength(0);
  });

  test("reports unknown UI source buckets", () => {
    const findings = detectBucketViolations(
      "packages/ui/src/layout/page-shell.tsx",
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("primitives");
  });

  test("reports utility files inside component buckets", () => {
    const findings = detectBucketViolations("packages/ui/src/primitives/cn.ts");

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("utils");
  });

  test("reports components inside utils", () => {
    const findings = detectBucketViolations("packages/ui/src/utils/Button.tsx");

    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain("primitives");
  });

  test("checks files through the pokayoke context", async () => {
    const result = await uiSourceBuckets.run(
      createContext([
        "packages/ui/src/primitives/button.tsx",
        "packages/ui/src/utils/cn.ts",
        "packages/ui/src/trays/tray-glyph.tsx",
      ]),
    );

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.file).toBe(
      "packages/ui/src/trays/tray-glyph.tsx",
    );
  });
});

const createContext = (
  files: readonly string[],
): RuleContext<Record<string, never>> => ({
  execAdapter: async () => ({ exitCode: 0, stderr: "", stdout: "" }),
  files: async () => [...files],
  fix: false,
  options: {},
  packageJson: async () => ({}),
  parseTypescript: async () => {
    throw new Error("parseTypescript is not used by this rule.");
  },
  readFile: async () => "",
  report: () => {},
  root: "",
  workspaces: async () => [],
});
