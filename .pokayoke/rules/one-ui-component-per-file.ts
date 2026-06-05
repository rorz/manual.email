import { defineRule, type Finding, locate } from "pokayoke";
import ts from "typescript";

const RULE_ID = "ui/one-component-per-file" as const;
const uiSourceGlob = new Bun.Glob("packages/ui/src/**/*.tsx");

interface ComponentDeclaration {
  readonly name: string;
  readonly node: ts.Node;
}

export const oneUiComponentPerFile = defineRule({
  meta: {
    id: RULE_ID,
    docs: "Keep each shared UI component in its own file.",
    kind: "file",
  },
  async run(context) {
    const findings: Finding[] = [];

    for (const file of await context.files()) {
      if (!isUiSource(file)) continue;

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
  const components = findTopLevelComponents(sourceFile);
  if (components.length <= 1) return [];

  const extraComponent = components[1];
  const location = locate(source, extraComponent.node.getStart(sourceFile));
  const componentNames = components
    .map((component) => component.name)
    .join(", ");

  return [
    {
      ruleId: RULE_ID,
      severity: "error",
      message: `File declares ${components.length} UI components: ${componentNames}.`,
      file,
      line: location.line,
      column: location.column,
      advice:
        "Move each component into its own file and re-export it from the nearest barrel.",
    },
  ];
};

export const findTopLevelComponents = (
  sourceFile: ts.SourceFile,
): ComponentDeclaration[] => {
  const components: ComponentDeclaration[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      components.push(...findVariableComponents(statement));
      continue;
    }

    if (isNamedComponentDeclaration(statement)) {
      components.push({ name: statement.name.text, node: statement });
    }
  }

  return components;
};

const findVariableComponents = (
  statement: ts.VariableStatement,
): ComponentDeclaration[] => {
  const components: ComponentDeclaration[] = [];

  for (const declaration of statement.declarationList.declarations) {
    if (!ts.isIdentifier(declaration.name)) continue;
    if (!isComponentName(declaration.name.text)) continue;
    if (declaration.initializer === undefined) continue;
    if (!isComponentInitializer(declaration.initializer)) continue;

    components.push({
      name: declaration.name.text,
      node: declaration.name,
    });
  }

  return components;
};

const isNamedComponentDeclaration = (
  statement: ts.Statement,
): statement is ts.FunctionDeclaration | ts.ClassDeclaration =>
  ((ts.isFunctionDeclaration(statement) && hasJsx(statement.body)) ||
    isReactClass(statement)) &&
  statement.name !== undefined &&
  isComponentName(statement.name.text);

const isComponentInitializer = (node: ts.Expression): boolean => {
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return hasJsx(node.body);
  }

  if (!ts.isCallExpression(node)) return false;

  const callee = callExpressionName(node.expression);
  if (callee !== "forwardRef" && callee !== "memo") return false;

  return node.arguments.some(
    (argument) =>
      (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) &&
      hasJsx(argument.body),
  );
};

const isReactClass = (
  statement: ts.Statement,
): statement is ts.ClassDeclaration => {
  if (!ts.isClassDeclaration(statement)) return false;

  return (
    statement.heritageClauses?.some((clause) =>
      clause.types.some((heritage) =>
        /(^|\.)Component$/.test(expressionText(heritage.expression)),
      ),
    ) === true
  );
};

const hasJsx = (node: ts.Node | undefined): boolean => {
  if (node === undefined) return false;
  if (
    ts.isJsxElement(node) ||
    ts.isJsxFragment(node) ||
    ts.isJsxSelfClosingElement(node)
  ) {
    return true;
  }

  return ts.forEachChild(node, hasJsx) === true;
};

const callExpressionName = (node: ts.LeftHandSideExpression): string | null => {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) return node.name.text;

  return null;
};

const expressionText = (node: ts.Expression): string => {
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isPropertyAccessExpression(node)) {
    return `${expressionText(node.expression)}.${node.name.text}`;
  }

  return "";
};

const isComponentName = (name: string): boolean =>
  /^[A-Z][A-Za-z0-9]*$/.test(name);

const isUiSource = (file: string): boolean => {
  if (/\.d\.tsx$/.test(file)) return false;
  if (/\.generated\.tsx$/.test(file)) return false;

  return uiSourceGlob.match(file);
};
