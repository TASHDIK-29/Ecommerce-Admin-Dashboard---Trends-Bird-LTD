import {
  Boxes,
  FolderTree,
  Image,
  KeyRound,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Section 4.3: `watch` means may see this menu entry and open this screen. */
  watch: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, watch: "dashboard:watch" },
  { label: "Permissions", href: "/permissions", icon: KeyRound, watch: "permission:watch" },
  { label: "Roles", href: "/roles", icon: ShieldCheck, watch: "role:watch" },
  { label: "Users", href: "/users", icon: Users, watch: "user:watch" },
  { label: "Media", href: "/media", icon: Image, watch: "media:watch" },
  { label: "Categories", href: "/categories", icon: FolderTree, watch: "category:watch" },
  { label: "Brands", href: "/brands", icon: Tags, watch: "brand:watch" },
  { label: "Attributes", href: "/attributes", icon: Boxes, watch: "attribute:watch" },
  { label: "Products", href: "/products", icon: Package, watch: "product:watch" },
];
