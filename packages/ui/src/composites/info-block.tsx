import type * as React from "react";

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
