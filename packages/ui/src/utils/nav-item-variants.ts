import { cva } from "class-variance-authority";

export const navItemVariants = cva("rounded-md px-3 py-2 text-sm", {
  defaultVariants: { selected: false },
  variants: {
    selected: {
      false: "text-neutral-700 hover:bg-neutral-100",
      true: "bg-neutral-900 text-white",
    },
  },
});
