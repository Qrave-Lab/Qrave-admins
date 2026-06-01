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
  Menu,
  X,
  Mail,
  FileClock,
  Cpu,
  PhoneCall,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operations", label: "Operations", icon: Wrench },
  { href: "/restaurants", label: "Restaurants", icon: Store },
  { href: "/menu", label: "Menu Management", icon: Utensils },
  { href: "/staff", label: "Staff", icon: Users },
  { href: "/discounts", label: "Discounts & Coupons", icon: TicketPercent },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/analytics", label: "Analytics", icon: LineChart },
  { href: "/owner-mail", label: "Owner Mail", icon: Mail },
  { href: "/leads", label: "Leads & Callbacks", icon: PhoneCall },
  { href: "/logs", label: "Logs & Support", icon: FileText },
  { href: "/qadmins", label: "QAdmin Access", icon: ShieldCheck },
  { href: "/audit-logs", label: "Audit Logs", icon: FileClock },
  { href: "/system", label: "System Control", icon: Cpu },
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
    window.localStorage.setItem(
      "qrave.sa.sidebar.collapsed",
      collapsed ? "1" : "0",
    );
  }, [collapsed]);

  const navItemClass = (active: boolean) =>
    `group relative flex items-center transition-all duration-150 ${
      collapsed
        ? "mx-auto h-12 w-12 justify-center rounded-2xl border"
        : "gap-3 rounded-2xl px-3.5 py-3"
    } text-sm font-medium ${
      active
        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/15 border-slate-900"
        : collapsed
          ? "border-slate-200 bg-slate-50/80 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-900"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const navItems = links.map((link) => {
    const active =
      pathname === link.href || pathname.startsWith(`${link.href}/`);
    const Icon = link.icon;
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => setMobileOpen(false)}
        className={navItemClass(active)}
        title={link.label}
        aria-label={link.label}
      >
        <Icon
          size={18}
          strokeWidth={active ? 2.5 : 2}
          className={
            active
              ? "text-white"
              : collapsed
                ? "text-slate-500 group-hover:text-slate-900"
                : "text-slate-500 group-hover:text-slate-900"
          }
        />
        {!collapsed && (
          <span className={active ? "text-white" : ""}>{link.label}</span>
        )}
      </Link>
    );
  });

  return (
    <>
      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
        <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
          Q
        </div>
        <p className="flex-1 text-sm font-bold text-slate-900 tracking-tight">
          Qrave Superadmin
        </p>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className={`md:hidden fixed top-[52px] left-0 bottom-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
          {navItems}
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-3">
          <ThemeToggle inline className="w-full justify-center" />
          <button
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={async () => {
              await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
              });
              router.push("/login");
            }}
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex ${collapsed ? "w-[88px] border-slate-200 bg-slate-50/95" : "w-[260px] border-slate-200 bg-white"} shrink-0 h-screen sticky top-0 border-r flex-col transition-all duration-300 overflow-hidden ${collapsed ? "shadow-[inset_-1px_0_0_rgba(148,163,184,0.12)]" : ""}`}
      >
        {/* Logo + toggle */}
        <div
          className={`flex items-center ${collapsed ? "flex-col justify-center gap-3 px-3 py-4" : "justify-between px-5"} border-b border-slate-100`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                Q
              </div>
              <p className="truncate text-[14px] font-bold text-slate-900 tracking-tight">
                Qrave Superadmin
              </p>
            </div>
          )}
          {collapsed && (
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shadow-slate-900/10">
                Q
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-400">
                Qrave
              </p>
            </div>
          )}
          <button
            type="button"
            className={`flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 ${collapsed ? "border border-slate-200 bg-white/90" : ""}`}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} />
            ) : (
              <PanelLeftClose size={15} />
            )}
          </button>
        </div>

        {/* Nav links */}
        <nav
          className={`flex flex-col ${collapsed ? "gap-2 px-3 py-4" : "gap-2 p-3.5"} flex-1 overflow-y-auto overflow-x-hidden`}
        >
          {navItems}
        </nav>

        {/* Logout */}
        <div
          className={`${collapsed ? "px-3 py-4" : "p-3.5"} border-t border-slate-100 bg-inherit`}
        >
          <ThemeToggle
            inline
            compact={collapsed}
            className={
              collapsed ? "mx-auto mb-3" : "mb-3 w-full justify-center"
            }
          />
          <button
            className={`w-full flex items-center ${collapsed ? "justify-center h-12 w-12 mx-auto rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-900/5 hover:border-red-200 hover:bg-red-50 hover:text-red-600" : "gap-3 px-3.5 py-3 rounded-2xl"} text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors`}
            onClick={async () => {
              await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
              });
              router.push("/login");
            }}
            title="Logout"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
