"use client";

import { Button, cn, InfoBlock, panelVariants } from "@manual.email/ui";
import Editor from "@monaco-editor/react";
import { useState } from "react";

export const CustomSourceEditor = ({
  action,
  defaultSource,
  formId,
  source,
}: {
  action: (form: FormData) => Promise<void>;
  defaultSource: string;
  formId: string;
  source: string;
}) => {
  const [value, setValue] = useState(source);

  return (
    <form action={action} id={formId} className={cn(panelVariants(), "p-4")}>
      <textarea className="hidden" name="customSource" readOnly value={value} />
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Custom Program</h3>
          <p className="mt-1 max-w-2xl text-neutral-500 text-sm leading-6">
            Custom mode runs your TypeScript default export in a fresh
            Cloudflare Sandbox for each message. Invalid output is treated as a
            custom-program failure and quarantines the message.
          </p>
        </div>
        <div className="shrink-0">
          <Button
            onClick={() => setValue(defaultSource)}
            type="button"
            variant="secondary"
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="mb-3 grid gap-2 text-neutral-600 text-xs md:grid-cols-3">
        <InfoBlock
          title="Input"
          value="subject, sender, body, html. Body/html are decoded strings and capped before execution."
        />
        <InfoBlock
          title="Output"
          value='Return pass with tags, or reject with category and reason. Tags are lowercase slugs like "important".'
        />
        <InfoBlock
          title="Libraries"
          value="Bun, TypeScript, zod, ai, @ai-sdk/google, and internet access. No first-party secrets."
        />
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <Editor
          defaultLanguage="typescript"
          height="520px"
          onChange={(next) => setValue(next ?? "")}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: "on",
          }}
          theme="vs-light"
          value={value}
        />
      </div>
    </form>
  );
};
