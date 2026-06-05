import type * as React from "react";

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
