import type * as React from "react";
import { SectionKicker } from "../primitives";

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
