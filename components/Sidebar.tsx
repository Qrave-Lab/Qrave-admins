"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Store,
  DollarSign,
  LineChart,
  TicketPercent,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Utensils,
  Users,
  FileText,
  ShieldCheck,
  Wrench,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operations", label: "Operations", icon: Wrench },
  { href: "/restaurants", label: "Restaurants", icon: Store },
  { href: "/menu", label: "Menu Management", icon: Utensils },
  { href: "/staff", label: "Staff Management", icon: Users },
  { href: "/discounts", label: "Discounts & Coupons", icon: TicketPercent },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/logs", label: "Logs & Support", icon: FileText },
  { href: "/qadmins", label: "QAdmin Access", icon: ShieldCheck },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("qrave.sa.sidebar.collapsed") === "1";
  });

  useEffect(() => {
    window.localStorage.setItem("qrave.sa.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      className={`${collapsed ? "md:w-[88px]" : "md:w-[260px]"} w-full md:h-screen shrink-0 border-r border-brand-200 bg-white transition-all duration-300 flex flex-col`}
    >
      <div className="flex items-center justify-between px-5 py-5 border-b border-brand-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-brand-900 border border-brand-900 text-white flex items-center justify-center font-bold shadow-sm">
            Q
          </div>
          {!collapsed && <p className="truncate text-[15px] font-bold text-brand-900 tracking-tight">Qrave Superadmin</p>}
        </div>
        <button
          type="button"
          className="hidden md:flex items-center justify-center h-8 w-8 rounded-lg text-brand-500 hover:bg-brand-100 hover:text-brand-900 transition-colors"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto md:overflow-x-hidden p-4 flex-1">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group relative flex items-center ${collapsed ? "justify-center" : ""} gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "bg-brand-900 text-white"
                  : "text-brand-600 hover:bg-brand-100/60 hover:text-brand-900"
              }`}
              title={collapsed ? link.label : ""}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} style={active ? { color: "white" } : {}} className={!active ? "text-slate-500 group-hover:text-slate-900" : ""} />
              {!collapsed && <span style={active ? { color: "white" } : {}}>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:block p-4 border-t border-brand-100">
        <button
          className={`w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-lg px-3 py-2.5 text-sm font-medium text-brand-600 hover:bg-red-50 hover:text-red-600 transition-colors duration-200`}
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            router.push("/login");
          }}
          title={collapsed ? "Logout" : ""}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
