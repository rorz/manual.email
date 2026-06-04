import type { FilterMode } from "@manual.email/db";
import {
  Button,
  choiceCardVariants,
  cn,
  Field,
  Notice,
  panelVariants,
  SectionHeader,
  Textarea,
} from "@manual.email/ui";
import Link from "next/link";
import {
  updateCustomFilterAction,
  updateManagedFilterAction,
} from "@/app/actions";
import {
  DEFAULT_CUSTOM_SOURCE,
  type FilterPreferences,
} from "@/lib/filter-preferences";
import { CustomSourceEditor } from "./custom-source-editor";

export const FilteringPreferences = ({
  activeMode,
  filter,
}: {
  activeMode: FilterMode;
  filter: FilterPreferences;
}) => {
  const activeFormId =
    activeMode === "managed" ? "managed-filter-form" : "custom-filter-form";

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        action={
          <Button form={activeFormId} type="submit" variant="primary">
            Save {activeMode === "managed" ? "Managed" : "Custom"}
          </Button>
        }
        title="Filtering"
      />

      <div className="grid gap-2 md:grid-cols-2">
        <ModeLink
          description="Use the built-in Gemini classifier. You tune policy with prompts; the app owns the harness."
          href="/preferences?section=filtering&filter=managed"
          selected={activeMode === "managed"}
          title="Managed"
        />
        <ModeLink
          description="Replace the classifier with your own Sandbox program. You own the verdict contract."
          href="/preferences?section=filtering&filter=custom"
          selected={activeMode === "custom"}
          title="Custom"
        />
      </div>

      {activeMode === "custom" ? <CustomWarning /> : null}

      {activeMode === "managed" ? (
        <ManagedPanel filter={filter} formId={activeFormId} />
      ) : (
        <CustomPanel
          formId={activeFormId}
          source={filter.customSource ?? DEFAULT_CUSTOM_SOURCE}
        />
      )}
    </div>
  );
};

const ModeLink = ({
  description,
  href,
  selected,
  title,
}: {
  description: string;
  href: string;
  selected: boolean;
  title: string;
}) => (
  <Link className={choiceCardVariants({ selected })} href={href}>
    <span className="block font-medium text-neutral-900 text-sm">{title}</span>
    <span className="mt-1 block text-neutral-500 text-xs leading-5">
      {description}
    </span>
  </Link>
);

const CustomWarning = () => (
  <Notice className="leading-6">
    Saving Custom disables Managed filtering for this mailbox. Your program
    becomes the sole pass/reject contract; invalid output or thrown errors can
    quarantine messages.
  </Notice>
);

const ManagedPanel = ({
  filter,
  formId,
}: {
  filter: FilterPreferences;
  formId: string;
}) => (
  <form
    action={updateManagedFilterAction}
    id={formId}
    className={cn(panelVariants(), "p-4")}
  >
    <div className="mb-4">
      <div>
        <h3 className="text-lg font-semibold">Managed Filtering</h3>
        <p className="mt-1 max-w-2xl text-neutral-500 text-sm leading-6">
          Managed mode classifies mail with Gemini Flash Lite. The tag prompt is
          the everyday tuning knob; the safety prompt controls pass/reject
          policy.
        </p>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-2">
      <Field htmlFor="safety-prompt" label="Safety Prompt">
        <Textarea
          className="min-h-44"
          defaultValue={filter.safetyPrompt}
          id="safety-prompt"
          name="safetyPrompt"
        />
      </Field>
      <Field htmlFor="tag-prompt" label="Tag Prompt">
        <Textarea
          className="min-h-44"
          defaultValue={filter.tagPrompt}
          id="tag-prompt"
          name="tagPrompt"
        />
      </Field>
    </div>
  </form>
);

const CustomPanel = ({
  formId,
  source,
}: {
  formId: string;
  source: string;
}) => (
  <CustomSourceEditor
    action={updateCustomFilterAction}
    defaultSource={DEFAULT_CUSTOM_SOURCE}
    formId={formId}
    source={source}
  />
);
