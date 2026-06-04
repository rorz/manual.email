import { defineConfig, definePlugin } from "pokayoke";

import { enforceArrowFunction } from "./rules/enforce-arrow-function";
import { maxFileLines } from "./rules/max-file-lines";

export default defineConfig({
  extends: ["pokayoke/recommended"],
  plugins: [
    definePlugin({
      name: "local",
      rules: {
        [enforceArrowFunction.meta.id]: enforceArrowFunction,
        [maxFileLines.meta.id]: maxFileLines,
      },
    }),
  ],
  files: [
    "AGENTS.md",
    "README.md",
    "docs/**/*.md",
    "package.json",
    "apps/**/*.{css,ts,tsx}",
    "packages/**/*.{ts,tsx}",
    ".pokayoke/**/*.ts",
  ],
  ignores: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
  suppressions: {
    directive: "pokayoke-ignore",
    legacyDirectives: ["appraise-ignore"],
    requireReason: true,
    reportUnused: "warn",
  },
  rules: {
    "package/catalog": "error",
    "package/workspace-protocol": ["error", { protocol: "workspace:*" }],
    "structure/max-file-lines": ["error", { max: 350 }],
    "typescript/enforce-arrow-function": "error",
  },
});
