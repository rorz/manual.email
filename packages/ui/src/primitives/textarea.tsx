import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn, inputVariants } from "../utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof inputVariants>;

export const Textarea = ({ className, size, ...props }: TextareaProps) => (
  <textarea className={cn(inputVariants({ size }), className)} {...props} />
);
