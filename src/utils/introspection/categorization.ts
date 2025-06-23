import {
  Users,
  Activity,
  Database,
  Settings,
  Grid,
  Trophy,
  BarChart3,
  Coins,
  Package,
  Zap,
  Globe,
  Calendar,
  Clock,
  Mail,
  Image,
  File,
  MessageSquare,
  Shield,
  Wallet,
  DollarSign,
  Bell,
  Flag,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_PATTERNS = {
  "User Management": [
    "user",
    "profile",
    "account",
    "identity",
    "auth",
    "login",
    "register",
    "signup",
    "signin",
    "credential",
    "member",
    "player",
  ],
  "Room & Sessions": [
    "room",
    "session",
    "lobby",
    "channel",
    "group",
    "party",
    "match",
    "game",
    "instance",
    "server",
    "join",
    "leave",
    "enter",
    "exit",
  ],
  "Content & Media": [
    "block",
    "item",
    "asset",
    "media",
    "file",
    "image",
    "document",
    "content",
    "post",
    "message",
    "comment",
    "data",
  ],
  Financial: [
    "currency",
    "money",
    "coin",
    "token",
    "price",
    "cost",
    "payment",
    "transaction",
    "wallet",
    "balance",
    "revenue",
    "earning",
  ],
  Configuration: [
    "config",
    "setting",
    "preference",
    "option",
    "template",
    "schema",
    "rule",
    "policy",
    "parameter",
    "default",
  ],
  Analytics: [
    "stat",
    "metric",
    "analytics",
    "report",
    "log",
    "event",
    "tracking",
    "monitor",
    "performance",
    "usage",
    "activity",
  ],
  System: [
    "init",
    "setup",
    "install",
    "deploy",
    "system",
    "admin",
    "manage",
    "control",
    "process",
    "service",
    "daemon",
  ],
  Security: [
    "permission",
    "role",
    "access",
    "security",
    "auth",
    "token",
    "secret",
    "key",
    "encrypt",
    "decrypt",
    "hash",
  ],
} as const;

const ICON_MAP: Record<string, LucideIcon> = {
  // User-related
  user: Users,
  profile: Users,
  account: Users,
  member: Users,
  player: Users,
  identity: Users,
  auth: Shield,
  login: Shield,
  register: Users,

  // Room-related
  room: Activity,
  session: Activity,
  lobby: Activity,
  channel: MessageSquare,
  group: Users,
  party: Users,
  match: Trophy,
  game: Trophy,

  // Content-related
  block: Grid,
  item: Package,
  asset: Package,
  media: Image,
  file: File,
  document: File,
  content: File,
  post: MessageSquare,
  message: MessageSquare,
  comment: MessageSquare,

  // Financial
  currency: Coins,
  money: DollarSign,
  coin: Coins,
  token: Coins,
  price: DollarSign,
  cost: DollarSign,
  payment: DollarSign,
  wallet: Wallet,
  balance: Wallet,
  revenue: BarChart3,

  // Configuration
  config: Settings,
  setting: Settings,
  template: Package,
  rule: Settings,
  policy: Shield,
  parameter: Settings,

  // Analytics
  stat: BarChart3,
  metric: BarChart3,
  analytics: BarChart3,
  report: BarChart3,
  log: File,
  event: Zap,
  tracking: BarChart3,

  // System
  init: Settings,
  setup: Settings,
  system: Database,
  admin: Shield,
  process: Zap,
  service: Database,

  // Time-related
  time: Clock,
  date: Calendar,
  created: Calendar,
  updated: Calendar,

  // Communication
  email: Mail,
  mail: Mail,
  notification: Bell,
  alert: Bell,

  // Status
  online: Globe,
  active: Zap,
  status: Flag,
  state: Flag,

  // Default
  default: Database,
};

export const categorizeItem = (name: string): string => {
  const lowerName = name.toLowerCase();

  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (patterns.some((pattern) => lowerName.includes(pattern))) {
      return category;
    }
  }

  return "Other";
};

export const getIconForItem = (name: string): LucideIcon => {
  const lowerName = name.toLowerCase();

  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lowerName.includes(key)) {
      return icon;
    }
  }

  return ICON_MAP.default;
};
