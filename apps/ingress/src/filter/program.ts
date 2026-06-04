/**
 * Program sources executed **inside the Sandbox** (under bun), never in the
 * Worker. They're shipped as strings so the Worker can write them into the
 * container at runtime.
 *
 * `FILTER_CONTRACT` is the TypeScript interface + runtime schema both managed
 * and custom sources can import. `RUNNER` is the fixed harness both modes share
 * ("same pipes"): it reads and validates the `FilterInput`, invokes
 * `main.ts`'s default export, validates the verdict, and writes it to a file.
 * Managed mode writes `MANAGED_PROGRAM` as `main.ts`; custom mode writes the
 * user's source instead. A program that throws or emits invalid output leaves
 * no verdict file — interpreted fail-closed for custom, retryable for managed.
 *
 * `MANAGED_PROGRAM` is the hardened first-party classifier: it uses the AI SDK
 * with Gemini Flash Lite (key + safety/tag prompts injected via env),
 * structured output, retries, and timeout handling, then maps the result onto a
 * verdict.
 */

/** Standard filter-program contract written next to every program run. */
export const FILTER_CONTRACT = `import { z } from "zod";

export const filterInputSchema = z.object({
  subject: z.string().nullable(),
  sender: z.string().email(),
  body: z.string(),
  html: z.string().nullable(),
});

export const tagSlugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,31}$/);

const passVerdictSchema = z.object({
  disposition: z.literal("pass"),
  tags: z.array(tagSlugSchema).max(16),
});

const rejectVerdictSchema = z.object({
  disposition: z.literal("reject"),
  category: z.enum(["spam", "phishing", "other"]),
  reason: z.string(),
});

export const filterVerdictSchema = z.discriminatedUnion("disposition", [
  passVerdictSchema,
  rejectVerdictSchema,
]);

export type FilterInput = z.infer<typeof filterInputSchema>;
export type FilterVerdict = z.infer<typeof filterVerdictSchema>;
export type FilterProgram = (
  input: FilterInput,
) => FilterVerdict | Promise<FilterVerdict>;
`;

/** Fixed harness: file in -> default export -> validated file out. */
export const RUNNER = `import {
  filterInputSchema,
  filterVerdictSchema,
} from "./filter-contract.ts";

const writeError = async (error) => {
  const path = process.env.FILTER_ERROR;
  if (!path) return;
  const message = error instanceof Error ? error.stack || error.message : String(error);
  await Bun.write(path, message);
};

try {
  const inputPath = process.env.FILTER_INPUT;
  const outputPath = process.env.FILTER_OUTPUT;
  if (!inputPath || !outputPath) {
    throw new Error("missing FILTER_INPUT or FILTER_OUTPUT");
  }

  const module = await import("./main.ts");
  if (typeof module.default !== "function") {
    throw new Error("filter program must default-export a function");
  }

  const input = filterInputSchema.parse(await Bun.file(inputPath).json());
  const verdict = await module.default(input);
  const parsed = filterVerdictSchema.parse(verdict);
  await Bun.write(outputPath, JSON.stringify(parsed));
} catch (error) {
  await writeError(error);
}
`;

/** Hardened managed classifier (string source run under bun in the Sandbox). */
export const MANAGED_PROGRAM = `import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import type { FilterProgram } from "./filter-contract.ts";

const MODEL = "gemini-flash-lite-latest";

const resultSchema = z.object({
  decision: z.enum(["pass", "spam", "phishing"]),
  importance: z.enum(["important", "unimportant"]),
  reason: z.string(),
});

const classify: FilterProgram = async (input) => {
  const key = process.env.GEMINI_FLASH_LITE;
  if (!key) throw new Error("missing GEMINI_FLASH_LITE");
  const base = process.env.GEMINI_BASE_URL;
  const baseURL = base
    ? base.replace(/\\/$/, "").replace(/\\/v1beta$/, "") + "/v1beta"
    : undefined;
  const google = createGoogleGenerativeAI({
    apiKey: key,
    ...(baseURL ? { baseURL } : {}),
  });
  const safety = process.env.SAFETY_PROMPT || "";
  const tagging = process.env.TAG_PROMPT || "";
  const system = safety + "\\n\\n" + tagging +
    "\\n\\nClassify the email. decision: pass for legitimate mail, spam for " +
    "unsolicited bulk mail, phishing for credential or payment fraud. " +
    "importance: important or unimportant according to the tagging policy. " +
    "reason: one short sentence.";
  const prompt = "From: " + input.sender + "\\nSubject: " +
    (input.subject || "(none)") + "\\n\\nText body:\\n" + input.body +
    (input.html ? "\\n\\nHTML body:\\n" + input.html : "");

  const { output } = await generateText({
    model: google(MODEL),
    system,
    prompt,
    output: Output.object({
      schema: resultSchema,
      name: "email_filter_verdict",
      description: "Email filtering classification and importance.",
    }),
    temperature: 0,
    maxOutputTokens: 256,
    maxRetries: 2,
    timeout: { totalMs: 12_000 },
  });

  if (output.decision === "pass") {
    const tag = output.importance === "important" ? "important" : "unimportant";
    return { disposition: "pass", tags: [tag] };
  }
  const category = output.decision === "spam" || output.decision === "phishing"
    ? output.decision
    : "other";
  return { disposition: "reject", category, reason: output.reason || "" };
};

export default classify;
`;
