import { cva } from "class-variance-authority";

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
