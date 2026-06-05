import { StackIcon, WarningOctagonIcon } from "@phosphor-icons/react/ssr";

export const SystemTrayGlyph = ({
  className = "size-4 shrink-0",
  kind,
}: {
  className?: string;
  kind: "everything" | "quarantine";
}) =>
  kind === "everything" ? (
    <StackIcon className={className} />
  ) : (
    <WarningOctagonIcon className={className} />
  );
