import { defineRule, type Finding, locate } from "pokayoke";
import ts from "typescript";

const RULE_ID = "typescript/enforce-arrow-function" as const;

type FunctionNode = ts.FunctionDeclaration | ts.FunctionExpression;

export const enforceArrowFunction = defineRule({
  meta: {
    docs: "Prefer arrow bindings over function declarations or expressions.",
    id: RULE_ID,
    kind: "file",
  },
  async run(context) {
    const findings: Finding[] = [];

    for (const file of await context.files()) {
      if (!isTypescriptSource(file)) continue;

      const source = await context.readFile(file);
      const sourceFile = await context.parseTypescript(file);

      findings.push(...detectViolations(file, source, sourceFile));
    }

    return { findings };
  },
});

export const detectViolations = (
  file: string,
  source: string,
  sourceFile: ts.SourceFile,
): Finding[] => {
  const nodes: FunctionNode[] = [];
  collectFunctionNodes(sourceFile, nodes);

  const overloads = buildExemptOverloads(nodes);
  const findings: Finding[] = [];

  for (const node of nodes) {
    if (node.asteriskToken !== undefined) continue;
    if (ts.isFunctionDeclaration(node) && overloads.has(node)) continue;

    const start = node.getStart(sourceFile);
    const location = locate(source, start);
    const subject = functionSubject(node);

    findings.push({
      advice: "Prefer const name = (...) => { ... }.",
      column: location.column,
      file,
      line: location.line,
      message: `Use an arrow function instead of "${subject}".`,
      ruleId: RULE_ID,
      severity: "error",
    });
  }

  return findings;
};

const collectFunctionNodes = (node: ts.Node, results: FunctionNode[]): void => {
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
    results.push(node);
  }

  ts.forEachChild(node, (child) => collectFunctionNodes(child, results));
};

const buildExemptOverloads = (
  nodes: readonly FunctionNode[],
): ReadonlySet<ts.FunctionDeclaration> => {
  const byName = new Map<string, ts.FunctionDeclaration[]>();

  for (const node of nodes) {
    if (!ts.isFunctionDeclaration(node)) continue;
    if (node.name === undefined) continue;

    const bucket = byName.get(node.name.text) ?? [];
    bucket.push(node);
    byName.set(node.name.text, bucket);
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

const isTypescriptSource = (file: string): boolean => {
  if (!/\.(ts|tsx)$/.test(file)) return false;
  if (/\.d\.(ts|tsx)$/.test(file)) return false;
  if (/\.generated\.(ts|tsx)$/.test(file)) return false;

  return true;
};
