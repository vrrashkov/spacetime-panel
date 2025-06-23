import {
  Activity,
  Users,
  Settings,
  Plus,
  Trash,
  Eye,
  Grid,
  MessageSquare,
  LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  room: Activity,
  user: Users,
  update: Settings,
  create: Plus,
  delete: Trash,
  get: Eye,
  set: Settings,
  config: Settings,
  block: Grid,
  message: MessageSquare,
};

export const getPatternIcon = (pattern: string): LucideIcon | undefined => {
  const lowerPattern = pattern.toLowerCase();
  return Object.entries(ICON_MAP).find(([key]) =>
    lowerPattern.includes(key)
  )?.[1];
};
