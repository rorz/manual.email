import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { buttonVariants, cn } from "../utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = ({ className, size, variant, ...props }: ButtonProps) => (
  <button
    className={cn(buttonVariants({ size, variant }), className)}
    {...props}
  />
);
