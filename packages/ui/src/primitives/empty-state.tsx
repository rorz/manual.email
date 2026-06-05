import type * as React from "react";
import { cn } from "../utils";

export const EmptyState = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(
      "rounded-md border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500 text-sm",
      className,
    )}
    {...props}
  />
);
