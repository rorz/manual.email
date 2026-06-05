import { cva } from "class-variance-authority";

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
