import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "./primitives";

export const PageShell = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) => (
  <main
    className={cn("flex w-full flex-1 flex-col bg-neutral-50", className)}
    {...props}
  />
);

export const PageHeader = ({
  action,
  eyebrow,
  title,
}: {
  action?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
}) => (
  <header className="border-neutral-200 border-b px-6 py-4">
    {eyebrow ? (
      <p className="font-mono text-neutral-500 text-xs">{eyebrow}</p>
    ) : null}
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
      {action}
    </div>
  </header>
);

export const SectionHeader = ({
  action,
  title,
}: {
  action?: React.ReactNode;
  title: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4">
    <SectionKicker>{title}</SectionKicker>
    {action}
  </div>
);

export const SectionKicker = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2
    className={cn("font-medium text-neutral-500 text-xs uppercase", className)}
    {...props}
  />
);

export const panelVariants = cva(
  "rounded-md border border-neutral-200 bg-white",
);

export const Panel = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(panelVariants(), className)} {...props} />
);

export const EmptyState = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p
    className={cn(
      "rounded-md border border-neutral-200 bg-white px-4 py-8 text-center text-neutral-500 text-sm",
      className,
    )}
    {...props}
  />
);

export const noticeVariants = cva("rounded-md border px-3 py-2 text-sm", {
  defaultVariants: { tone: "warning" },
  variants: {
    tone: {
      neutral: "border-neutral-200 bg-white text-neutral-700",
      warning: "border-amber-300 bg-amber-50 text-amber-900",
    },
  },
});

export type NoticeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof noticeVariants>;

export const Notice = ({ className, tone, ...props }: NoticeProps) => (
  <div className={cn(noticeVariants({ tone }), className)} {...props} />
);

export const InfoBlock = ({
  title,
  value,
}: {
  title: React.ReactNode;
  value: React.ReactNode;
}) => (
  <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
    <div className="font-medium text-neutral-800">{title}</div>
    <div className="mt-1 leading-5">{value}</div>
  </div>
);
