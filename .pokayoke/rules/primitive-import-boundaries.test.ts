import { describe, expect, test } from "bun:test";
import { parseTypescriptSource, type RuleContext } from "pokayoke";

import {
  detectPrimitiveImportViolations,
  primitiveImportBoundaries,
} from "./primitive-import-boundaries.rule";

describe("ui/primitive-import-boundaries", () => {
  test("reports primitives importing other component files", () => {
    const source = [
      'import { Badge } from "./badge";',
      'import { cn } from "../utils";',
      'export { Field } from "../composites/field";',
    ].join("\n");

    const findings = detectPrimitiveImportViolations(
      "packages/ui/src/primitives/button.tsx",
      source,
      parseTypescriptSource("packages/ui/src/primitives/button.tsx", source),
    );

    expect(findings.map((finding) => finding.line)).toEqual([1, 3]);
  });

  test("allows primitive folder-local files and shared utils", () => {
    const source = [
      'import { processMetallicPaintImage } from "./image";',
      'import { createMetallicPaintProgram } from "./webgl";',
      'import { cn } from "../../utils";',
    ].join("\n");

    const findings = detectPrimitiveImportViolations(
      "packages/ui/src/primitives/metallic-paint/index.tsx",
      source,
      parseTypescriptSource(
        "packages/ui/src/primitives/metallic-paint/index.tsx",
        source,
      ),
    );

    expect(findings).toHaveLength(0);
  });

  test("allows primitive barrels to re-export primitives", async () => {
    const source = 'export * from "./button";';
    const result = await primitiveImportBoundaries.run(
      createContext({
        files: ["packages/ui/src/primitives/index.ts"],
        sources: {
          "packages/ui/src/primitives/index.ts": source,
        },
      }),
    );

    expect(result.findings).toHaveLength(0);
  });
});

const createContext = ({
  files,
  sources,
}: {
  readonly files: string[];
  readonly sources: Record<string, string>;
}): RuleContext<Record<string, never>> => ({
  files: async () => files,
  fix: false,
  glob: async () => [],
  options: {},
  packageJson: async () => ({}),
  parseTypescript: async (file) =>
    parseTypescriptSource(file, sources[file] ?? ""),
  readFile: async (file) => sources[file] ?? "",
  report: () => {},
  root: "",
  workspaces: async () => [],
});
