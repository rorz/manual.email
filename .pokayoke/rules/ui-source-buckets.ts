import { defineRule, type Finding } from "pokayoke";

const RULE_ID = "ui/source-buckets" as const;
const UI_SOURCE_PREFIX = "packages/ui/src/";
const INDEX_FILE = "index.ts";
const componentBuckets = new Set(["composites", "primitives"]);
const utilityBucket = "utils";

export const uiSourceBuckets = defineRule({
  meta: {
    id: RULE_ID,
    docs: "Keep shared UI source split into primitives, composites, and utils.",
    kind: "project",
  },
  async run(context) {
    const findings: Finding[] = [];

    for (const file of await context.files()) {
      findings.push(...detectBucketViolations(file));
    }

    return { findings };
  },
});

export const detectBucketViolations = (file: string): Finding[] => {
  if (!file.startsWith(UI_SOURCE_PREFIX)) return [];

  const relativePath = file.slice(UI_SOURCE_PREFIX.length);
  if (relativePath === INDEX_FILE) return [];

  const [bucket, ...pathParts] = relativePath.split("/");
  if (bucket === undefined || pathParts.length === 0) {
    return [invalidBucketFinding(file)];
  }

  if (componentBuckets.has(bucket)) {
    return detectComponentBucketViolations(file, pathParts);
  }

  if (bucket === utilityBucket) {
    return detectUtilityBucketViolations(file);
  }

  return [invalidBucketFinding(file)];
};

const detectComponentBucketViolations = (
  file: string,
  pathParts: readonly string[],
): Finding[] => {
  if (pathParts.at(-1) === INDEX_FILE) return [];
  if (file.endsWith(".tsx")) return [];

  return [
    {
      ruleId: RULE_ID,
      severity: "error",
      message: "Utility files in the UI package belong in utils.",
      file,
      line: 1,
      advice:
        "Move non-component source to packages/ui/src/utils and export it from the utils barrel.",
    },
  ];
};

const detectUtilityBucketViolations = (file: string): Finding[] => {
  if (!file.endsWith(".tsx")) return [];

  return [
    {
      ruleId: RULE_ID,
      severity: "error",
      message:
        "Component files in the UI package belong in primitives or composites.",
      file,
      line: 1,
      advice:
        "Move TSX components to packages/ui/src/primitives or packages/ui/src/composites.",
    },
  ];
};

const invalidBucketFinding = (file: string): Finding => ({
  ruleId: RULE_ID,
  severity: "error",
  message:
    "UI source must live under packages/ui/src/primitives, packages/ui/src/composites, or packages/ui/src/utils.",
  file,
  line: 1,
  advice:
    "Move the file into the matching UI bucket and re-export it from that bucket's index.",
});
