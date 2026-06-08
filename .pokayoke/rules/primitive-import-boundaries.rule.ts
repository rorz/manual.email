import { posix } from "node:path";
import { defineRule, type Finding, locate } from "pokayoke";
import ts from "typescript";

const RULE_ID = "ui/primitive-import-boundaries" as const;
const UI_SOURCE_PREFIX = "packages/ui/src/";
const PRIMITIVES_PREFIX = `${UI_SOURCE_PREFIX}primitives/`;
const COMPONENT_BUCKETS = new Set(["composites", "primitives"]);

interface ComponentReference {
  readonly bucket: string;
  readonly name: string;
}

export const primitiveImportBoundaries = defineRule({
  meta: {
    id: RULE_ID,
    docs: "Prevent primitives from importing other UI component files.",
    kind: "file",
  },
  async run(context) {
    const findings: Finding[] = [];

    for (const file of await context.files()) {
      if (!isPrimitiveSource(file)) continue;

      const source = await context.readFile(file);
      const sourceFile = await context.parseTypescript(file);
      findings.push(
        ...detectPrimitiveImportViolations(file, source, sourceFile),
      );
    }

    return { findings };
  },
});

export const detectPrimitiveImportViolations = (
  file: string,
  source: string,
  sourceFile: ts.SourceFile,
): Finding[] => {
  const sourceComponent = primitiveComponentName(file);
  if (sourceComponent === null) return [];

  const findings: Finding[] = [];

  for (const statement of sourceFile.statements) {
    const specifier = moduleSpecifierText(statement);
    if (specifier === null) continue;
    if (!specifier.startsWith(".")) continue;

    const target = componentReference(resolveRelativeImport(file, specifier));
    if (target === null) continue;
    if (target.bucket === "primitives" && target.name === sourceComponent) {
      continue;
    }

    const location = locate(source, statement.getStart(sourceFile));
    findings.push({
      ruleId: RULE_ID,
      severity: "error",
      message: "Primitives must not import other UI component files.",
      file,
      line: location.line,
      column: location.column,
      advice:
        "Keep primitive dependencies local to the same component folder, or move shared code to packages/ui/src/utils.",
    });
  }

  return findings;
};

const isPrimitiveSource = (file: string): boolean => {
  if (!file.startsWith(PRIMITIVES_PREFIX)) return false;
  if (!/\.(ts|tsx)$/.test(file)) return false;
  if (/\.d\.(ts|tsx)$/.test(file)) return false;
  if (/\.generated\.(ts|tsx)$/.test(file)) return false;

  return true;
};

const moduleSpecifierText = (statement: ts.Statement): string | null => {
  if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
    const specifier = statement.moduleSpecifier;
    if (specifier !== undefined && ts.isStringLiteral(specifier)) {
      return specifier.text;
    }
  }

  return null;
};

const resolveRelativeImport = (file: string, specifier: string): string =>
  posix.normalize(posix.join(posix.dirname(file), specifier));

const primitiveComponentName = (file: string): string | null => {
  const relativePath = file.slice(PRIMITIVES_PREFIX.length);
  const [firstPart, secondPart] = relativePath.split("/");
  if (firstPart === undefined || firstPart === "index.ts") return null;

  if (secondPart !== undefined) return firstPart;
  if (!firstPart.endsWith(".tsx")) return null;

  return stripExtension(firstPart);
};

const componentReference = (target: string): ComponentReference | null => {
  if (!target.startsWith(UI_SOURCE_PREFIX)) return null;

  const relativePath = target.slice(UI_SOURCE_PREFIX.length);
  const [bucket, firstPart, secondPart] = relativePath.split("/");
  if (bucket === undefined || firstPart === undefined) return null;
  if (!COMPONENT_BUCKETS.has(bucket)) return null;
  if (firstPart === "index" || firstPart === "index.ts") {
    return { bucket, name: firstPart };
  }

  return {
    bucket,
    name: secondPart === undefined ? stripExtension(firstPart) : firstPart,
  };
};

const stripExtension = (filename: string): string =>
  filename.replace(/\.(ts|tsx)$/, "");
