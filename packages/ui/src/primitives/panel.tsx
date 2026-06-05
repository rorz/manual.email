import type * as React from "react";
import { cn, panelVariants } from "../utils";

export const Panel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(panelVariants(), className)} {...props} />
);
