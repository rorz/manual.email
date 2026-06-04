import {
  ArchiveIcon,
  BankIcon,
  BellIcon,
  BookmarkSimpleIcon,
  BookOpenIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChartLineIcon,
  ChatTextIcon,
  ClockIcon,
  CodeIcon,
  CoffeeIcon,
  CrownIcon,
  EnvelopeSimpleIcon,
  FileTextIcon,
  FlagPennantIcon,
  FolderIcon,
  GearIcon,
  GiftIcon,
  GlobeIcon,
  GraduationCapIcon,
  HeartIcon,
  KeyIcon,
  LightningIcon,
  LockIcon,
  MegaphoneIcon,
  NewspaperIcon,
  NotePencilIcon,
  PackageIcon,
  PaletteIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  ReceiptIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparkleIcon,
  StackIcon,
  StarIcon,
  TagIcon,
  TargetIcon,
  TrayIcon,
  UsersIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react/ssr";
import type { CSSProperties } from "react";
import {
  DEFAULT_TRAY_ICON,
  normalizeTrayIcon,
  type TrayIconName,
} from "./tray-options";

type IconComponent = typeof TrayIcon;

const icons = {
  archive: ArchiveIcon,
  bank: BankIcon,
  bell: BellIcon,
  book: BookOpenIcon,
  bookmark: BookmarkSimpleIcon,
  briefcase: BriefcaseIcon,
  calendar: CalendarIcon,
  chart: ChartLineIcon,
  chat: ChatTextIcon,
  clock: ClockIcon,
  code: CodeIcon,
  coffee: CoffeeIcon,
  crown: CrownIcon,
  envelope: EnvelopeSimpleIcon,
  file: FileTextIcon,
  flag: FlagPennantIcon,
  folder: FolderIcon,
  gear: GearIcon,
  gift: GiftIcon,
  globe: GlobeIcon,
  "graduation-cap": GraduationCapIcon,
  heart: HeartIcon,
  key: KeyIcon,
  lightning: LightningIcon,
  lock: LockIcon,
  megaphone: MegaphoneIcon,
  newspaper: NewspaperIcon,
  note: NotePencilIcon,
  package: PackageIcon,
  palette: PaletteIcon,
  "paper-plane": PaperPlaneTiltIcon,
  receipt: ReceiptIcon,
  rocket: RocketLaunchIcon,
  shield: ShieldCheckIcon,
  "shopping-bag": ShoppingBagIcon,
  sparkle: SparkleIcon,
  star: StarIcon,
  tag: TagIcon,
  target: TargetIcon,
  tray: TrayIcon,
  users: UsersIcon,
} satisfies Record<TrayIconName, IconComponent>;

export const TrayGlyph = ({
  className = "size-4 shrink-0",
  color,
  icon,
}: {
  className?: string;
  color?: string | null;
  icon?: string | null;
}) => {
  const Icon = icons[normalizeTrayIcon(icon ?? DEFAULT_TRAY_ICON)];
  const style: CSSProperties | undefined = color ? { color } : undefined;
  return <Icon className={className} style={style} />;
};

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

export const NewTrayGlyph = ({
  className = "size-4 shrink-0",
}: {
  className?: string;
}) => <PlusIcon className={className} />;
