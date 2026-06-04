/**
 * Program sources executed **inside the Sandbox** (under bun), never in the
 * Worker. They're shipped as strings so the Worker can write them into the
 * container at runtime.
 *
 * `RUNNER` is the fixed harness both modes share ("same pipes"): it reads the
 * `FilterInput` from a file, invokes `main.ts`'s default export, and writes the
 * verdict to a file. Managed mode writes `MANAGED_PROGRAM` as `main.ts`; custom
 * mode writes the user's source instead. A program that throws or emits nothing
 * leaves no verdict file — which the consumer treats as fail-closed.
 *
 * `MANAGED_PROGRAM` is the hardened first-party classifier: it calls Gemini
 * Flash Lite (key + system prompt injected via env) with structured output and
 * maps the result onto a verdict, emitting the reserved `important` /
 * `unimportant` tags. Kept free of template literals so it embeds cleanly here.
 */

/** Fixed harness: file in → default export → file out. */
export const RUNNER = `import classify from "./main.ts";
const input = await Bun.file(process.env.FILTER_INPUT).json();
const verdict = await classify(input);
await Bun.write(process.env.FILTER_OUTPUT, JSON.stringify(verdict));
`;

/** Hardened managed classifier (string source run under bun in the Sandbox). */
export const MANAGED_PROGRAM = `type Input = { subject: string | null; sender: string; body: string };

const MODEL = "gemini-flash-lite-latest";

export default async function classify(input: Input) {
  const key = process.env.GEMINI_FLASH_LITE;
  if (!key) throw new Error("missing GEMINI_FLASH_LITE");
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";
  const system = (process.env.SYSTEM_PROMPT || "") +
    "\\n\\nClassify the email. decision: pass for legitimate mail, spam for " +
    "unsolicited bulk mail, phishing for credential or payment fraud. " +
    "importance: important for time-sensitive or personally relevant mail, " +
    "else unimportant. reason: one short sentence.";
  const user = "From: " + input.sender + "\\nSubject: " +
    (input.subject || "(none)") + "\\n\\n" + input.body;
  const res = await fetch(base + "/v1beta/models/" + MODEL + ":generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            decision: { type: "string", enum: ["pass", "spam", "phishing"] },
            importance: { type: "string", enum: ["important", "unimportant"] },
            reason: { type: "string" },
          },
          required: ["decision", "importance", "reason"],
        },
      },
    }),
  });
  if (!res.ok) throw new Error("gemini " + res.status);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("gemini empty response");
  const out = JSON.parse(text);
  if (out.decision === "pass") {
    const tag = out.importance === "important" ? "important" : "unimportant";
    return { disposition: "pass", tags: [tag] };
  }
  const category = out.decision === "spam" || out.decision === "phishing"
    ? out.decision
    : "other";
  return { disposition: "reject", category, reason: out.reason || "" };
}
`;
