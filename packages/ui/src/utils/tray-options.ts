export const DEFAULT_TRAY_COLOR = "#404040";
export const DEFAULT_TRAY_ICON = "tray";

export const TRAY_COLORS = [
  { value: "#404040", label: "Neutral" },
  { value: "#dc2626", label: "Red" },
  { value: "#e11d48", label: "Rose" },
  { value: "#db2777", label: "Pink" },
  { value: "#9333ea", label: "Purple" },
  { value: "#4f46e5", label: "Indigo" },
  { value: "#2563eb", label: "Blue" },
  { value: "#0891b2", label: "Cyan" },
  { value: "#16a34a", label: "Green" },
  { value: "#65a30d", label: "Lime" },
  { value: "#ca8a04", label: "Yellow" },
  { value: "#ea580c", label: "Orange" },
] as const;

export const TRAY_ICON_OPTIONS = [
  { value: "tray", label: "Tray" },
  { value: "folder", label: "Folder" },
  { value: "star", label: "Star" },
  { value: "tag", label: "Tag" },
  { value: "envelope", label: "Mail" },
  { value: "paper-plane", label: "Sent" },
  { value: "bell", label: "Bell" },
  { value: "lightning", label: "Lightning" },
  { value: "heart", label: "Heart" },
  { value: "clock", label: "Clock" },
  { value: "calendar", label: "Calendar" },
  { value: "megaphone", label: "Megaphone" },
  { value: "receipt", label: "Receipt" },
  { value: "briefcase", label: "Briefcase" },
  { value: "bank", label: "Bank" },
  { value: "shopping-bag", label: "Shopping" },
  { value: "package", label: "Package" },
  { value: "book", label: "Book" },
  { value: "graduation-cap", label: "Learning" },
  { value: "newspaper", label: "News" },
  { value: "chat", label: "Chat" },
  { value: "users", label: "People" },
  { value: "globe", label: "Globe" },
  { value: "shield", label: "Shield" },
  { value: "lock", label: "Lock" },
  { value: "key", label: "Key" },
  { value: "chart", label: "Chart" },
  { value: "target", label: "Target" },
  { value: "code", label: "Code" },
  { value: "file", label: "File" },
  { value: "note", label: "Note" },
  { value: "bookmark", label: "Bookmark" },
  { value: "flag", label: "Flag" },
  { value: "crown", label: "Crown" },
  { value: "gift", label: "Gift" },
  { value: "coffee", label: "Coffee" },
  { value: "rocket", label: "Rocket" },
  { value: "sparkle", label: "Sparkle" },
  { value: "palette", label: "Palette" },
  { value: "gear", label: "Gear" },
  { value: "archive", label: "Archive" },
] as const;

export type TrayIconName = (typeof TRAY_ICON_OPTIONS)[number]["value"];

const iconNames = new Set<string>(
  TRAY_ICON_OPTIONS.map((option) => option.value),
);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const normalizeTrayIcon = (value: string | null): TrayIconName =>
  iconNames.has(value as TrayIconName)
    ? (value as TrayIconName)
    : DEFAULT_TRAY_ICON;

export const normalizeTrayColor = (value: string | null): string =>
  HEX_COLOR.test(value ?? "")
    ? (value as string).toLowerCase()
    : DEFAULT_TRAY_COLOR;
