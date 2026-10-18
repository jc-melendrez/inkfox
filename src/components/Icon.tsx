import {
  AlignLeft,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Flame,
  Home,
  Inbox,
  Info,
  Layers,
  Library,
  Lightbulb,
  ListOrdered,
  Pause,
  PenLine,
  RefreshCw,
  SearchX,
  Settings,
  Timer,
  Trash2,
  TrendingUp,
  TriangleAlert,
  Trophy,
  Upload,
  User,
  X,
} from "lucide-react";

/** Only the icons we use are imported, so the production bundle stays small. */
const ICONS = {
  home: Home,
  library: Library,
  practice: PenLine,
  progress: TrendingUp,
  profile: User,
  settings: Settings,
  check: Check,
  alert: TriangleAlert,
  minus: CircleMinus,
  upload: Upload,
  file: FileText,
  clock: Clock,
  trash: Trash2,
  timer: Timer,
  pause: Pause,
  chevron: ChevronDown,
  tip: Lightbulb,
  close: X,
  eye: Eye,
  eyeOff: EyeOff,
  info: Info,
  error: CircleAlert,
  success: CircleCheck,
  flame: Flame,
  trophy: Trophy,
  layers: Layers,
  list: ListOrdered,
  align: AlignLeft,
  retry: RefreshCw,
  inbox: Inbox,
  search: SearchX,
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** When set, the icon is meaningful: role="img" + aria-label. Otherwise decorative. */
  label?: string;
}

export function Icon({ name, size = "md", className, label }: Props) {
  const Cmp = ICONS[name];
  return (
    <Cmp
      className={["icon", `icon--${size}`, className].filter(Boolean).join(" ")}
      strokeWidth={1.75}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    />
  );
}
