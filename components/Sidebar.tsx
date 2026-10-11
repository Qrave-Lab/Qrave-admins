"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  SlidersHorizontal,
  Menu,
  X,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operations", label: "Operations", icon: Wrench },
  { href: "/restaurants", label: "Restaurants", icon: Store },
  { href: "/plans", label: "Plans & Flags", icon: SlidersHorizontal },
  { href: "/menu", label: "Menu Management", icon: Utensils },
  { href: "/staff", label: "Staff", icon: Users },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("qrave.sa.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const navItems = links.map((link) => {
    const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => setMobileOpen(false)}
        className={`group flex items-center ${collapsed ? "justify-center px-0 py-0 h-12 w-12 mx-auto" : "gap-3 px-3.5 py-3"} rounded-2xl text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-slate-900 text-white shadow-sm shadow-slate-900/10"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
        title={collapsed ? link.label : ""}
      >
        <Icon
          size={18}
          strokeWidth={active ? 2.5 : 2}
          className={active ? "text-white" : "text-slate-500 group-hover:text-slate-900"}
        />
        {!collapsed && <span className={active ? "text-white" : ""}>{link.label}</span>}
      </Link>
    );
  });

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="h-8 px-2 py-1 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
          <img src="/logo.png" alt="Qrave" className="h-5 w-auto object-contain" />
        </div>
        <p className="flex-1 text-sm font-bold text-slate-900 tracking-tight">Superadmin</p>
        <button
          type="button"
          onClick={() => setMobileOpen(v => !v)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Mobile Drawer ── */}
      <aside className={`md:hidden fixed top-[52px] left-0 bottom-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
          {navItems}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              router.push("/login");
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside className={`hidden md:flex ${collapsed ? "w-[84px]" : "w-[260px]"} shrink-0 h-screen sticky top-0 border-r border-slate-200 bg-white flex-col transition-all duration-300 overflow-hidden`}>
        {/* Logo + toggle */}
        <div className={`flex ${collapsed ? "flex-col items-center gap-3 py-4 px-2" : "items-center justify-between px-5 py-4"} border-b border-slate-100`}>
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 px-2 py-1 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0 shadow-xs">
                  <img src="/logo.png" alt="Qrave" className="h-6 w-auto object-contain" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-bold text-slate-900 tracking-tight leading-none">Superadmin</span>
                  <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider mt-1">Control Plane</span>
                </div>
              </div>
              <button
                type="button"
                className="flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
              >
                <PanelLeftClose size={15} />
              </button>
            </>
          ) : (
            <>
              <div className="h-9 w-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center p-1 shadow-xs" title="Qrave Superadmin">
                <img src="/logo.png" alt="Qrave" className="h-full w-full object-contain" />
              </div>
              <button
                type="button"
                className="flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                onClick={() => setCollapsed(false)}
                title="Expand sidebar"
              >
                <PanelLeftOpen size={15} />
              </button>
            </>
          )}
        </div>

        {/* Nav links */}
        <nav className={`flex flex-col gap-2 ${collapsed ? "px-3 py-4" : "p-3.5"} flex-1 overflow-y-auto overflow-x-hidden`}>
          {navItems}
        </nav>

        {/* Logout */}
        <div className={`${collapsed ? "px-3 py-4" : "p-3.5"} border-t border-slate-100`}>
          <button
            className={`w-full flex items-center ${collapsed ? "justify-center h-12 w-12 mx-auto px-0 py-0" : "gap-3 px-3.5 py-3"} rounded-2xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors`}
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
    </>
  );
}
