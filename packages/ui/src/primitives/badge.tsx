import type * as React from "react";
import { cn } from "../utils";

export const Badge = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex max-w-full items-center rounded border border-neutral-200 px-1.5 py-0.5 text-xs",
      className,
    )}
    {...props}
  />
);
