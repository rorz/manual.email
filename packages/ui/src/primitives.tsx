import { cva, type VariantProps } from "class-variance-authority";
import { type ClassValue, clsx } from "clsx";
import type * as React from "react";

export const cn = (...values: ClassValue[]) => clsx(...values);

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: "md",
      variant: "secondary",
    },
    variants: {
      size: {
        icon: "size-8",
        md: "px-4 py-2",
        sm: "px-3 py-1.5",
      },
      variant: {
        danger:
          "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50",
        dashed:
          "border border-dashed border-neutral-300 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700",
        ghost: "text-neutral-600 hover:bg-neutral-100",
        link: "p-0 text-blue-600 underline",
        primary: "bg-neutral-900 text-white hover:bg-neutral-800",
        secondary:
          "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
        subtle:
          "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50",
      },
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = ({ className, size, variant, ...props }: ButtonProps) => (
  <button
    className={cn(buttonVariants({ size, variant }), className)}
    {...props}
  />
);

export const inputVariants = cva(
  "w-full rounded-md border border-neutral-300 bg-white text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-500 disabled:opacity-50",
  {
    defaultVariants: { size: "md" },
    variants: {
      size: {
        md: "px-3 py-2",
        sm: "px-2.5 py-1.5",
      },
    },
  },
);

export type InputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> &
  VariantProps<typeof inputVariants>;

export const Input = ({ className, size, ...props }: InputProps) => (
  <input className={cn(inputVariants({ size }), className)} {...props} />
);

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> &
  VariantProps<typeof inputVariants>;

export const Textarea = ({ className, size, ...props }: TextareaProps) => (
  <textarea className={cn(inputVariants({ size }), className)} {...props} />
);

export const Field = ({
  children,
  className,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  label: React.ReactNode;
}) => (
  <div className={cn("flex flex-col gap-1 text-sm", className)}>
    {htmlFor ? (
      <label className="font-medium text-neutral-700" htmlFor={htmlFor}>
        {label}
      </label>
    ) : (
      <span className="font-medium text-neutral-700">{label}</span>
    )}
    {children}
  </div>
);

export const navItemVariants = cva("rounded-md px-3 py-2 text-sm", {
  defaultVariants: { selected: false },
  variants: {
    selected: {
      false: "text-neutral-700 hover:bg-neutral-100",
      true: "bg-neutral-900 text-white",
    },
  },
});

export const choiceCardVariants = cva("rounded-md border bg-white p-3", {
  defaultVariants: { selected: false },
  variants: {
    selected: {
      false: "border-neutral-200 text-neutral-600 hover:border-neutral-300",
      true: "border-neutral-900",
    },
  },
});

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
