export const DEFAULT_TRAY_COLOR = "#404040";
export const DEFAULT_TRAY_ICON = "tray";

export const TRAY_COLORS = [
  { label: "Neutral", value: "#404040" },
  { label: "Red", value: "#dc2626" },
  { label: "Rose", value: "#e11d48" },
  { label: "Pink", value: "#db2777" },
  { label: "Purple", value: "#9333ea" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Blue", value: "#2563eb" },
  { label: "Cyan", value: "#0891b2" },
  { label: "Green", value: "#16a34a" },
  { label: "Lime", value: "#65a30d" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Orange", value: "#ea580c" },
] as const;

export const TRAY_ICON_OPTIONS = [
  { label: "Tray", value: "tray" },
  { label: "Folder", value: "folder" },
  { label: "Star", value: "star" },
  { label: "Tag", value: "tag" },
  { label: "Mail", value: "envelope" },
  { label: "Sent", value: "paper-plane" },
  { label: "Bell", value: "bell" },
  { label: "Lightning", value: "lightning" },
  { label: "Heart", value: "heart" },
  { label: "Clock", value: "clock" },
  { label: "Calendar", value: "calendar" },
  { label: "Megaphone", value: "megaphone" },
  { label: "Receipt", value: "receipt" },
  { label: "Briefcase", value: "briefcase" },
  { label: "Bank", value: "bank" },
  { label: "Shopping", value: "shopping-bag" },
  { label: "Package", value: "package" },
  { label: "Book", value: "book" },
  { label: "Learning", value: "graduation-cap" },
  { label: "News", value: "newspaper" },
  { label: "Chat", value: "chat" },
  { label: "People", value: "users" },
  { label: "Globe", value: "globe" },
  { label: "Shield", value: "shield" },
  { label: "Lock", value: "lock" },
  { label: "Key", value: "key" },
  { label: "Chart", value: "chart" },
  { label: "Target", value: "target" },
  { label: "Code", value: "code" },
  { label: "File", value: "file" },
  { label: "Note", value: "note" },
  { label: "Bookmark", value: "bookmark" },
  { label: "Flag", value: "flag" },
  { label: "Crown", value: "crown" },
  { label: "Gift", value: "gift" },
  { label: "Coffee", value: "coffee" },
  { label: "Rocket", value: "rocket" },
  { label: "Sparkle", value: "sparkle" },
  { label: "Palette", value: "palette" },
  { label: "Gear", value: "gear" },
  { label: "Archive", value: "archive" },
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
