import { describe, expect, test } from "bun:test";
import { parseTypescriptSource } from "pokayoke";

import { detectViolations } from "./enforce-arrow-function.rule";

describe("typescript/enforce-arrow-function", () => {
  test("reports function declarations and expressions", () => {
    const source = [
      "function declared() {",
      "  return 1;",
      "}",
      "const expressed = function named() {",
      "  return 2;",
      "};",
    ].join("\n");

    const findings = detectViolations(
      "apps/web/src/example.ts",
      source,
      parseTypescriptSource("apps/web/src/example.ts", source),
    );

    expect(findings.map((finding) => finding.line)).toEqual([1, 4]);
  });

  test("allows generators and overload clusters", () => {
    const source = [
      "function* generator() {",
      "  yield 1;",
      "}",
      "function overloaded(value: string): string;",
      "function overloaded(value: number): number;",
      "function overloaded(value: string | number) {",
      "  return value;",
      "}",
    ].join("\n");

    const findings = detectViolations(
      "packages/contracts/src/example.ts",
      source,
      parseTypescriptSource("packages/contracts/src/example.ts", source),
    );

    expect(findings).toHaveLength(0);
  });
});
