import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn, inputVariants } from "../utils";

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> &
  VariantProps<typeof inputVariants>;

export const Input = ({ className, size, ...props }: InputProps) => (
  <input className={cn(inputVariants({ size }), className)} {...props} />
);
