import { cva } from "class-variance-authority";

export const choiceCardVariants = cva("rounded-md border bg-white p-3", {
  defaultVariants: { selected: false },
  variants: {
    selected: {
      false: "border-neutral-200 text-neutral-600 hover:border-neutral-300",
      true: "border-neutral-900",
    },
  },
});
