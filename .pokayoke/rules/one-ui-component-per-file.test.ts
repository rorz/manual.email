import { describe, expect, test } from "bun:test";
import { parseTypescriptSource, type RuleContext } from "pokayoke";

import {
  detectViolations,
  findTopLevelComponents,
  oneUiComponentPerFile,
} from "./one-ui-component-per-file.rule";

describe("ui/one-component-per-file", () => {
  test("reports more than one component in a shared UI file", () => {
    const source = [
      "export const Button = () => <button />;",
      "",
      "export const Badge = () => <span />;",
    ].join("\n");

    const findings = detectViolations(
      "packages/ui/src/primitives/example.tsx",
      source,
      parseTypescriptSource("packages/ui/src/primitives/example.tsx", source),
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(3);
  });

  test("allows one component with variants and non-component helpers", () => {
    const source = [
      "const Icon = icons.tray;",
      "export const buttonVariants = cva('rounded-md');",
      "export const Button = ({ className }) => (",
      "  <button className={buttonVariants({ className })} />",
      ");",
    ].join("\n");

    const components = findTopLevelComponents(
      parseTypescriptSource("packages/ui/src/primitives/button.tsx", source),
    );

    expect(components.map((component) => component.name)).toEqual(["Button"]);
  });

  test("only checks TSX files in the shared UI package", async () => {
    const badSource = [
      "export const Button = () => <button />;",
      "export const Badge = () => <span />;",
    ].join("\n");

    const context = createContext({
      files: [
        "apps/web/src/example.tsx",
        "packages/ui/src/example.ts",
        "packages/ui/src/example.tsx",
      ],
      sources: {
        "apps/web/src/example.tsx": badSource,
        "packages/ui/src/example.ts": badSource,
        "packages/ui/src/example.tsx": badSource,
      },
    });

    const result = await oneUiComponentPerFile.run(context);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]?.file).toBe("packages/ui/src/example.tsx");
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
