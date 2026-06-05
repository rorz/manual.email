import { cva } from "class-variance-authority";

export const noticeVariants = cva("rounded-md border px-3 py-2 text-sm", {
  defaultVariants: { tone: "warning" },
  variants: {
    tone: {
      neutral: "border-neutral-200 bg-white text-neutral-700",
      warning: "border-amber-300 bg-amber-50 text-amber-900",
    },
  },
});
