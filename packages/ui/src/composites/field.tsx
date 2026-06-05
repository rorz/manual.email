import type * as React from "react";
import { cn } from "../utils";

export const Field = ({
  children,
  className,
  htmlFor,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
  label: React.ReactNode;
}) => (
  <div className={cn("flex flex-col gap-1 text-sm", className)}>
    {htmlFor ? (
      <label className="font-medium text-neutral-700" htmlFor={htmlFor}>
        {label}
      </label>
    ) : (
      <span className="font-medium text-neutral-700">{label}</span>
    )}
    {children}
  </div>
);
