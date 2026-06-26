import { defineRule, type Finding } from "pokayoke";

const RULE_ID = "ui/source-buckets" as const;
const UI_SOURCE_PREFIX = "packages/ui/src/";
const INDEX_FILE = "index.ts";
const COMPONENT_ENTRYPOINT = "index.tsx";
const componentBuckets = new Set(["composites", "primitives"]);
const utilityBucket = "utils";

export const uiSourceBuckets = defineRule({
  meta: {
    docs: "Keep shared UI source split into primitives, composites, and utils.",
    id: RULE_ID,
    kind: "project",
  },
  async run(context) {
    const findings: Finding[] = [];
    const files = await context.files();

    for (const file of files) {
      findings.push(...detectBucketViolations(file, files));
    }

    return { findings };
  },
});

export const detectBucketViolations = (
  file: string,
  allFiles: readonly string[] = [file],
): Finding[] => {
  if (!file.startsWith(UI_SOURCE_PREFIX)) return [];

  const relativePath = file.slice(UI_SOURCE_PREFIX.length);
  if (relativePath === INDEX_FILE) return [];

  const [bucket, ...pathParts] = relativePath.split("/");
  if (bucket === undefined || pathParts.length === 0) {
    return [invalidBucketFinding(file)];
  }

  if (componentBuckets.has(bucket)) {
    return detectComponentBucketViolations(file, bucket, pathParts, allFiles);
  }

  if (bucket === utilityBucket) {
    return detectUtilityBucketViolations(file, allFiles);
  }

  return [invalidBucketFinding(file)];
};

const detectComponentBucketViolations = (
  file: string,
  bucket: string,
  pathParts: readonly string[],
  allFiles: readonly string[],
): Finding[] => {
  if (pathParts.length === 1) {
    return detectTopLevelComponentBucketViolations(
      file,
      bucket,
      pathParts[0] ?? "",
      allFiles,
    );
  }

  return detectComponentFolderViolations(file, bucket, pathParts, allFiles);
};

const detectTopLevelComponentBucketViolations = (
  file: string,
  bucket: string,
  filename: string,
  allFiles: readonly string[],
): Finding[] => {
  if (filename === INDEX_FILE) return [];

  const componentName = stripExtension(filename);
  const splitComponentName = splitComponentFolderNameInBucket(
    componentName,
    allFiles,
    bucket,
  );
  if (splitComponentName !== null) {
    return [componentFolderSplitFinding(file, splitComponentName)];
  }

  if (file.endsWith(".tsx")) return [];

  return [
    {
      advice: `Move component-private helper files under packages/ui/src/${bucket}/<component>/, or move shared helpers to packages/ui/src/utils.`,
      file,
      line: 1,
      message:
        "Top-level component bucket files must be TSX components or index.ts barrels.",
      ruleId: RULE_ID,
      severity: "error",
    },
  ];
};

const detectComponentFolderViolations = (
  file: string,
  bucket: string,
  pathParts: readonly string[],
  allFiles: readonly string[],
): Finding[] => {
  const [componentName, ...componentFileParts] = pathParts;
  const filename = componentFileParts.at(-1);
  if (componentName === undefined || filename === undefined) {
    return [invalidBucketFinding(file)];
  }

  if (!hasComponentEntrypoint(allFiles, bucket, componentName)) {
    return [missingComponentEntrypointFinding(file, bucket, componentName)];
  }

  if (filename === INDEX_FILE) {
    return [componentEntrypointExtensionFinding(file, bucket, componentName)];
  }

  return [];
};

const detectUtilityBucketViolations = (
  file: string,
  allFiles: readonly string[],
): Finding[] => {
  const filename = file.split("/").at(-1) ?? "";
  const utilityName = stripExtension(filename);
  const splitComponentName = splitComponentFolderName(utilityName, allFiles);
  if (splitComponentName !== null) {
    return [componentFolderSplitFinding(file, splitComponentName)];
  }

  if (!file.endsWith(".tsx")) return [];

  return [
    {
      advice:
        "Move TSX components to packages/ui/src/primitives or packages/ui/src/composites.",
      file,
      line: 1,
      message:
        "Component files in the UI package belong in primitives or composites.",
      ruleId: RULE_ID,
      severity: "error",
    },
  ];
};

const componentFolderNames = (
  files: readonly string[],
  bucket: string,
): ReadonlySet<string> => {
  const names = new Set<string>();
  const bucketPrefix = `${UI_SOURCE_PREFIX}${bucket}/`;

  for (const file of files) {
    if (!file.startsWith(bucketPrefix)) continue;

    const relativePath = file.slice(bucketPrefix.length);
    const [componentName, nestedFile] = relativePath.split("/");
    if (componentName !== undefined && nestedFile !== undefined) {
      names.add(componentName);
    }
  }

  return names;
};

const splitComponentFolderName = (
  utilityName: string,
  allFiles: readonly string[],
): string | null => {
  for (const bucket of componentBuckets) {
    const componentName = splitComponentFolderNameInBucket(
      utilityName,
      allFiles,
      bucket,
    );
    if (componentName !== null) return componentName;
  }

  return null;
};

const splitComponentFolderNameInBucket = (
  filename: string,
  allFiles: readonly string[],
  bucket: string,
): string | null => {
  for (const componentName of componentFolderNames(allFiles, bucket)) {
    if (isComponentPrivateName(filename, componentName)) {
      return componentName;
    }
  }

  return null;
};

const hasComponentEntrypoint = (
  files: readonly string[],
  bucket: string,
  componentName: string,
): boolean =>
  files.includes(
    `${UI_SOURCE_PREFIX}${bucket}/${componentName}/${COMPONENT_ENTRYPOINT}`,
  );

const isComponentPrivateName = (
  filename: string,
  componentName: string,
): boolean =>
  filename === componentName || filename.startsWith(`${componentName}-`);

const stripExtension = (filename: string): string =>
  filename.replace(/\.(ts|tsx)$/, "");

const componentFolderSplitFinding = (
  file: string,
  componentName: string,
): Finding => ({
  advice:
    "Keep multi-file UI components under packages/ui/src/primitives/<name>/ or packages/ui/src/composites/<name>/.",
  file,
  line: 1,
  message: `Files for "${componentName}" must live inside that component folder.`,
  ruleId: RULE_ID,
  severity: "error",
});

const missingComponentEntrypointFinding = (
  file: string,
  bucket: string,
  componentName: string,
): Finding => ({
  advice: `Add packages/ui/src/${bucket}/${componentName}/${COMPONENT_ENTRYPOINT}, or move this file out of the component bucket.`,
  file,
  line: 1,
  message: `Component folder "${componentName}" is missing ${COMPONENT_ENTRYPOINT}.`,
  ruleId: RULE_ID,
  severity: "error",
});

const componentEntrypointExtensionFinding = (
  file: string,
  bucket: string,
  componentName: string,
): Finding => ({
  advice: `Rename packages/ui/src/${bucket}/${componentName}/${INDEX_FILE} to ${COMPONENT_ENTRYPOINT}.`,
  file,
  line: 1,
  message: `Component folder "${componentName}" must use ${COMPONENT_ENTRYPOINT}.`,
  ruleId: RULE_ID,
  severity: "error",
});

const invalidBucketFinding = (file: string): Finding => ({
  advice:
    "Move the file into the matching UI bucket and re-export it from that bucket's index.",
  file,
  line: 1,
  message:
    "UI source must live under packages/ui/src/primitives, packages/ui/src/composites, or packages/ui/src/utils.",
  ruleId: RULE_ID,
  severity: "error",
});
