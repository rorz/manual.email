#!/usr/bin/env bun

/**
 * appraise/enforce-arrow-function.ts
 *
 * Authored TypeScript in this repo uses arrow functions (`const x = () => {}`)
 * instead of `function` declarations / expressions. The AST scan keeps this
 * honest without tripping over comments, strings, or generated declarations.
 *
 * Algorithmic exemptions:
 *   - Generator functions (`function*` / `async function*`)
 *   - TypeScript overload clusters whose signatures share one implementation
 *
 * Inline opt-out — add on the violation line or the line immediately above:
 *
 *   // appraise-ignore: enforce-arrow-function -- <written justification>
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { collectFiles, hasIgnore, REPO_ROOT } from "./lib";

const RULE_ID = "enforce-arrow-function" as const;

const SCAN_GLOBS: readonly string[] = [
  "apps/**/*.{ts,tsx}",
  "packages/**/*.{ts,tsx}",
  "appraise/**/*.ts",
];

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression;

interface Violation {
  readonly col: number;
  readonly line: number;
  readonly relPath: string;
  readonly subject: string;
}

const isExcludedFile = (relPath: string): boolean => {
  if (/\.d\.(ts|tsx)$/.test(relPath)) return true;
  if (/\.generated\.(ts|tsx)$/.test(relPath)) return true;
  return false;
};

const lineAt = (source: string, position: number): string => {
  const start = source.lastIndexOf("\n", position - 1) + 1;
  const end = source.indexOf("\n", position);
  return source.slice(start, end === -1 ? source.length : end);
};

const prevLine = (source: string, position: number): string => {
  const currentStart = source.lastIndexOf("\n", position - 1) + 1;
  if (currentStart === 0) return "";
  const prevEnd = currentStart - 1;
  const prevStart = source.lastIndexOf("\n", prevEnd - 1) + 1;
  return source.slice(prevStart, prevEnd);
};

const collectFunctionNodes = (root: ts.Node, results: FunctionNode[]): void => {
  if (ts.isFunctionDeclaration(root) || ts.isFunctionExpression(root)) {
    results.push(root);
  }
  ts.forEachChild(root, (child) => collectFunctionNodes(child, results));
};

const buildExemptOverloads = (
  nodes: readonly FunctionNode[],
): ReadonlySet<ts.FunctionDeclaration> => {
  const byName = new Map<string, ts.FunctionDeclaration[]>();
  for (const node of nodes) {
    if (!ts.isFunctionDeclaration(node)) continue;
    if (node.name === undefined) continue;
    const name = node.name.text;
    const bucket = byName.get(name) ?? [];
    bucket.push(node);
    byName.set(name, bucket);
  }

  const exempt = new Set<ts.FunctionDeclaration>();
  for (const cluster of byName.values()) {
    if (cluster.length < 2) continue;
    if (!cluster.slice(0, -1).every((node) => node.body === undefined)) {
      continue;
    }
    for (const node of cluster) exempt.add(node);
  }
  return exempt;
};

const functionSubject = (node: FunctionNode): string => {
  const name = node.name?.text;
  if (name !== undefined) return name;
  return ts.isFunctionDeclaration(node)
    ? "(anonymous declaration)"
    : "function";
};

const isIgnored = (source: string, position: number, ruleId: string): boolean =>
  hasIgnore(lineAt(source, position), ruleId) ||
  hasIgnore(prevLine(source, position), ruleId);

export const detectViolations = (
  relPath: string,
  source: string,
): Violation[] => {
  const sourceFile = ts.createSourceFile(
    relPath,
    source,
    ts.ScriptTarget.Latest,
    true,
  );

  const nodes: FunctionNode[] = [];
  collectFunctionNodes(sourceFile, nodes);
  const exemptOverloads = buildExemptOverloads(nodes);
  const violations: Violation[] = [];

  for (const node of nodes) {
    if (node.asteriskToken !== undefined) continue;
    if (ts.isFunctionDeclaration(node) && exemptOverloads.has(node)) continue;

    const start = node.getStart(sourceFile);
    if (isIgnored(source, start, RULE_ID)) continue;

    const { character, line } = sourceFile.getLineAndCharacterOfPosition(start);
    violations.push({
      col: character,
      line: line + 1,
      relPath,
      subject: functionSubject(node),
    });
  }

  return violations;
};

const collectFindings = async (): Promise<Violation[]> => {
  const files = await collectFiles(SCAN_GLOBS);
  const findings: Violation[] = [];

  for (const relPath of files) {
    if (isExcludedFile(relPath)) continue;

    let source: string;
    try {
      source = readFileSync(resolve(REPO_ROOT, relPath), "utf8");
    } catch {
      continue;
    }

    findings.push(...detectViolations(relPath, source));
  }

  return findings;
};

const report = (findings: readonly Violation[]): void => {
  if (findings.length === 0) {
    console.log("appraise/enforce-arrow-function: OK");
    return;
  }

  console.error("");
  console.error(
    `appraise/enforce-arrow-function: ${findings.length} non-arrow function(s) found`,
  );
  console.error("");
  console.error("  Prefer arrow bindings for authored TypeScript:");
  console.error("    const name = (...) => { ... };");
  console.error("");

  for (const finding of findings) {
    console.error(
      `    ${finding.relPath}:${finding.line}:${finding.col} ${finding.subject}`,
    );
  }

  console.error("");
  console.error(
    "If a function declaration is genuinely required, add an adjacent note:",
  );
  console.error(
    "  // appraise-ignore: enforce-arrow-function -- <written justification>",
  );
  console.error("");
};

const findings = await collectFindings();
report(findings);
process.exit(findings.length === 0 ? 0 : 1);
