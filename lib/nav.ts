import {
  LayoutDashboard, Store, UtensilsCrossed, DollarSign, LineChart, TicketPercent,
  Utensils, Users, FileText, ShieldCheck, Wrench, SlidersHorizontal, Inbox,
  type LucideIcon,
} from "lucide-react";

export type BadgeKey = "tickets" | "leads" | "atRisk";
export type NavLink = { href: string; label: string; icon: LucideIcon; badge?: { key: BadgeKey; tone: "red" | "amber" | "blue"; noun: string } };
export type NavGroup = { label: string; links: NavLink[] };

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/operations", label: "Operations", icon: Wrench },
    ],
  },
  {
    label: "Customers",
    links: [
      { href: "/restaurants", label: "Restaurants", icon: Store, badge: { key: "atRisk", tone: "amber", noun: "at risk" } },
      { href: "/food-courts", label: "Food Courts", icon: UtensilsCrossed },
      { href: "/menu", label: "Menu Management", icon: Utensils },
      { href: "/staff", label: "Staff", icon: Users },
      { href: "/leads", label: "Contact Requests", icon: Inbox, badge: { key: "leads", tone: "blue", noun: "new" } },
    ],
  },
  {
    label: "Revenue",
    links: [
      { href: "/plans", label: "Plans & Flags", icon: SlidersHorizontal },
      { href: "/discounts", label: "Discounts & Coupons", icon: TicketPercent },
      { href: "/revenue", label: "Revenue", icon: DollarSign },
      { href: "/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    label: "System",
    links: [
      { href: "/logs", label: "Logs & Support", icon: FileText, badge: { key: "tickets", tone: "red", noun: "open tickets" } },
      { href: "/qadmins", label: "QAdmin Access", icon: ShieldCheck },
    ],
  },
];

export const allLinks: NavLink[] = navGroups.flatMap((g) => g.links);
