import type { LucideIcon } from "lucide-react";

export interface GroupableItem {
  id: string;
  name: string;
  label: string;
  category: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
  enabled: boolean;
  [key: string]: any;
}

export interface PatternGroup {
  pattern: string;
  displayName: string;
  items: GroupableItem[];
  depth: number;
  icon?: LucideIcon;
}
