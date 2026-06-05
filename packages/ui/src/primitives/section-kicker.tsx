import type * as React from "react";
import { cn } from "../utils";

export const SectionKicker = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn("font-medium text-neutral-500 text-xs uppercase", className)}
    {...props}
  />
);
