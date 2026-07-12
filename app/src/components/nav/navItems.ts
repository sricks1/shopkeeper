import type { LucideIcon } from "lucide-react";
import { Bell, ListChecks, Package, Wrench } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/notifications", label: "Alerts", icon: Bell },
];
