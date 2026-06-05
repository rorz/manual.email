import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn, noticeVariants } from "../utils";

export type NoticeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof noticeVariants>;

export const Notice = ({ className, tone, ...props }: NoticeProps) => (
  <div className={cn(noticeVariants({ tone }), className)} {...props} />
);
