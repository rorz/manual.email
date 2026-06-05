import type * as React from "react";
import { cn } from "../utils";

export const PageShell = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => (
  <main
    className={cn("flex w-full flex-1 flex-col bg-neutral-50", className)}
    {...props}
  />
);
