import type * as React from "react";
import { cn } from "../utils";

export const RemovableChip = ({
  children,
  className,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  className?: string;
  onRemove: () => void;
  removeLabel: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded border border-neutral-200 px-1.5 py-0.5 text-neutral-700 text-xs",
      className,
    )}
  >
    {children}
    <button
      aria-label={removeLabel}
      className="text-neutral-400 hover:text-neutral-900"
      onClick={onRemove}
      type="button"
    >
      x
    </button>
  </span>
);
