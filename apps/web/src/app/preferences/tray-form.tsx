"use client";

import {
  Button,
  cn,
  DEFAULT_TRAY_COLOR,
  DEFAULT_TRAY_ICON,
  Field,
  Input,
  normalizeTrayColor,
  normalizeTrayIcon,
  RemovableChip,
  TRAY_COLORS,
  TRAY_ICON_OPTIONS,
  TrayGlyph,
} from "@manual.email/ui";
import { useMemo, useState } from "react";
import type { MailTag, MailTray } from "@/lib/mailbox";

export const TrayForm = ({
  action,
  tags,
  tray,
}: {
  action: (form: FormData) => Promise<void>;
  tags: MailTag[];
  tray?: MailTray;
}) => {
  const nameId = tray ? `tray-name-${tray.id}` : "new-tray-name";
  const [color, setColor] = useState(
    normalizeTrayColor(tray?.color ?? DEFAULT_TRAY_COLOR),
  );
  const [icon, setIcon] = useState(
    normalizeTrayIcon(tray?.icon ?? DEFAULT_TRAY_ICON),
  );
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(
    () => new Set(tray?.tags.map((tag) => tag.id) ?? []),
  );

  return (
    <form action={action} className="max-w-4xl">
      {tray ? <input name="trayId" type="hidden" value={tray.id} /> : null}
      <input name="color" type="hidden" value={color} />
      <input name="icon" type="hidden" value={icon} />
      {[...selectedTagIds].map((tagId) => (
        <input key={tagId} name="tagId" type="hidden" value={tagId} />
      ))}

      <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)_auto]">
        <Field htmlFor={nameId} label="Name">
          <Input
            defaultValue={tray?.name}
            id={nameId}
            name="name"
            size="sm"
            type="text"
          />
        </Field>
        <AppearancePicker
          color={color}
          icon={icon}
          onColorChange={setColor}
          onIconChange={(value) => setIcon(normalizeTrayIcon(value))}
        />
        <Button className="self-end" size="sm" type="submit" variant="primary">
          {tray ? "Save" : "Create"}
        </Button>
        <div className="md:col-span-3">
          <TagPicker
            selectedTagIds={selectedTagIds}
            setSelectedTagIds={setSelectedTagIds}
            tags={tags}
          />
        </div>
      </div>
    </form>
  );
};

const AppearancePicker = ({
  color,
  icon,
  onColorChange,
  onIconChange,
}: {
  color: string;
  icon: string;
  onColorChange: (value: string) => void;
  onIconChange: (value: string) => void;
}) => {
  const [iconOpen, setIconOpen] = useState(false);
  const selectedIcon = TRAY_ICON_OPTIONS.find(
    (option) => option.value === icon,
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1">
        {TRAY_COLORS.map((option) => (
          <button
            aria-label={option.label}
            className={cn(
              "size-6 rounded border border-neutral-200",
              option.value === color &&
                "ring-2 ring-neutral-900/20 ring-offset-1",
            )}
            key={option.value}
            onClick={() => onColorChange(option.value)}
            style={{ backgroundColor: option.value }}
            title={option.label}
            type="button"
          />
        ))}
        <label
          className="grid size-6 cursor-pointer place-items-center rounded border border-neutral-300 bg-white"
          title="Custom color"
        >
          <input
            aria-label="Custom color"
            className="size-5 cursor-pointer opacity-0"
            onChange={(event) =>
              onColorChange(normalizeTrayColor(event.target.value))
            }
            type="color"
            value={color}
          />
          <span
            className="pointer-events-none col-start-1 row-start-1 size-4 rounded"
            style={{ backgroundColor: color }}
          />
        </label>
      </div>

      <div className="relative">
        <Button
          className="gap-2"
          onClick={() => setIconOpen((open) => !open)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <TrayGlyph color={color} icon={icon} />
          <span>{selectedIcon?.label ?? "Icon"}</span>
        </Button>
        {iconOpen ? (
          <div className="absolute z-20 mt-1 grid w-72 grid-cols-8 gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
            {TRAY_ICON_OPTIONS.map((option) => (
              <button
                aria-label={option.label}
                className={cn(
                  "grid size-8 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100",
                  option.value === icon && "bg-neutral-900 text-white",
                )}
                key={option.value}
                onClick={() => {
                  onIconChange(option.value);
                  setIconOpen(false);
                }}
                title={option.label}
                type="button"
              >
                <TrayGlyph className="size-5" icon={option.value} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const TagPicker = ({
  selectedTagIds,
  setSelectedTagIds,
  tags,
}: {
  selectedTagIds: Set<string>;
  setSelectedTagIds: (value: Set<string>) => void;
  tags: MailTag[];
}) => {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState("");
  const selectedTags = tags.filter((tag) => selectedTagIds.has(tag.id));
  const suggestions = useMemo(
    () => rankTags(tags, selectedTagIds, query).slice(0, 6),
    [tags, selectedTagIds, query],
  );
  const addTag = (tag: MailTag) => {
    setSelectedTagIds(new Set([...selectedTagIds, tag.id]));
    setQuery("");
  };

  return (
    <div className="relative rounded-md border border-neutral-200 bg-white p-1.5">
      <div className="flex min-h-8 flex-wrap items-center gap-1.5">
        {selectedTags.map((tag) => (
          <RemovableChip
            key={tag.id}
            onRemove={() => {
              const next = new Set(selectedTagIds);
              next.delete(tag.id);
              setSelectedTagIds(next);
            }}
            removeLabel={`Remove ${tag.label}`}
          >
            {tag.label}
          </RemovableChip>
        ))}
        <input
          className="min-w-36 flex-1 border-0 bg-transparent px-1 py-0.5 text-sm outline-none"
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              addTag(suggestions[0]);
            }
          }}
          placeholder="Add tag..."
          type="text"
          value={query}
        />
      </div>
      {focused && suggestions.length > 0 ? (
        <div className="absolute left-2 right-2 top-full z-10 mt-1 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg">
          {suggestions.map((tag) => (
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-100"
              key={tag.id}
              onClick={() => addTag(tag)}
              type="button"
            >
              <span>{tag.label}</span>
              <span className="font-mono text-neutral-400 text-xs">
                {tag.slug}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const rankTags = (tags: MailTag[], selected: Set<string>, query: string) =>
  tags
    .map((tag) => ({
      score: fuzzyScore(`${tag.label} ${tag.slug}`, query),
      tag,
    }))
    .filter(({ score, tag }) => score >= 0 && !selected.has(tag.id))
    .sort((a, b) => b.score - a.score || a.tag.label.localeCompare(b.tag.label))
    .map(({ tag }) => tag);

const fuzzyScore = (value: string, query: string): number => {
  const haystack = value.toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) return 1;
  const index = haystack.indexOf(needle);
  if (index >= 0) return 100 - index;

  let position = 0;
  let gaps = 0;
  for (const char of needle) {
    const found = haystack.indexOf(char, position);
    if (found < 0) return -1;
    gaps += found - position;
    position = found + 1;
  }
  return 50 - gaps;
};
