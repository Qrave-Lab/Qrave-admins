"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Menu, X, Search } from "lucide-react";
import { navGroups, type BadgeKey } from "@/lib/nav";
import { OPEN_PALETTE_EVENT } from "@/components/ui/CommandPalette";

const LEADS_SEEN_KEY = "qrave.sa.leads.seenAt";
const BADGE_POLL_MS = 60_000;
const badgeTone = {
  red: "bg-red-600 text-white",
  amber: "bg-amber-500 text-white",
  blue: "bg-blue-600 text-white",
} as const;

type Badges = Record<BadgeKey, number>;

function useBadges(pathname: string): Badges {
  const [badges, setBadges] = useState<Badges>({ tickets: 0, leads: 0, atRisk: 0 });

  useEffect(() => {
    // Opening Contact Requests marks everything received so far as seen.
    if (pathname.startsWith("/leads")) window.localStorage.setItem(LEADS_SEEN_KEY, new Date().toISOString());
    let cancelled = false;
    const load = async () => {
      try {
        const seen = window.localStorage.getItem(LEADS_SEEN_KEY);
        const res = await fetch(`/api/superadmin/badges${seen ? `?leadsSince=${encodeURIComponent(seen)}` : ""}`, { cache: "no-store" });
        if (res.ok && !cancelled) setBadges(await res.json());
      } catch {
        /* keep the last known counts */
      }
    };
    void load();
    const timer = window.setInterval(() => document.visibilityState === "visible" && void load(), BADGE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  return badges;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const badges = useBadges(pathname);

  // Read the stored preference after mount so server and client markup match.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setCollapsed(window.localStorage.getItem("qrave.sa.sidebar.collapsed") === "1");
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("qrave.sa.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed, hydrated]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const navItems = navGroups.map((group, gi) => (
    <div key={group.label} className={gi > 0 ? "mt-3" : ""}>
      {collapsed ? (
        gi > 0 && <div className="mx-auto mb-2 h-px w-6 bg-slate-200" aria-hidden />
      ) : (
        <p className="px-3.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</p>
      )}
      <div className={`flex flex-col ${collapsed ? "gap-2" : "gap-0.5"}`}>
        {group.links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          const count = link.badge ? badges[link.badge.key] : 0;
          const badgeText = count > 99 ? "99+" : String(count);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`group relative flex items-center ${collapsed ? "justify-center px-0 py-0 h-11 w-11 mx-auto" : "gap-3 px-3.5 py-2.5"} rounded-xl text-sm font-medium transition-colors duration-150 ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              title={collapsed ? link.label : undefined}
              aria-label={collapsed ? `${link.label}${count ? `, ${count} ${link.badge?.noun}` : ""}` : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? "text-white" : "text-slate-500 group-hover:text-slate-900"} aria-hidden />
              {!collapsed && <span className="flex-1">{link.label}</span>}
              {count > 0 && link.badge && (
                <span
                  className={`${collapsed ? "absolute -right-1 -top-1" : ""} inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-5 tabular-nums ${badgeTone[link.badge.tone]} ${active && !collapsed ? "ring-1 ring-white/40" : ""}`}
                >
                  {badgeText}
                  {!collapsed && <span className="sr-only"> {link.badge.noun}</span>}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  ));

  const searchButton = (
    <button
      type="button"
      onClick={() => {
        setMobileOpen(false);
        window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
      }}
      aria-label="Search pages"
      className={`flex items-center rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 transition-colors hover:bg-slate-100 ${
        collapsed ? "mx-auto h-11 w-11 justify-center" : "w-full gap-2 px-3 py-2.5"
      }`}
    >
      <Search size={16} aria-hidden />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">Jump to…</span>
          <kbd className="rounded border border-slate-200 bg-white px-1.5 text-[11px] font-semibold text-slate-500">⌘K</kbd>
        </>
      )}
    </button>
  );

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
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
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
      <aside aria-label="Main navigation" inert={!mobileOpen} className={`md:hidden fixed top-[52px] left-0 bottom-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
          <div className="mb-3">{searchButton}</div>
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
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop Sidebar ── */}
      <aside aria-label="Main navigation" className={`hidden md:flex ${collapsed ? "w-[84px]" : "w-[260px]"} shrink-0 h-screen sticky top-0 border-r border-slate-200 bg-white flex-col transition-[width] duration-300 ease-out overflow-hidden`}>
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
                  <span className="text-[11px] font-semibold text-orange-600 uppercase tracking-wider mt-1">Control Plane</span>
                </div>
              </div>
              <button
                type="button"
                className="flex items-center justify-center h-8 w-8 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
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
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen size={15} />
              </button>
            </>
          )}
        </div>

        {/* Nav links */}
        <nav className={`flex flex-col ${collapsed ? "px-3 py-4" : "p-3.5"} flex-1 overflow-y-auto overflow-x-hidden`}>
          <div className="mb-3">{searchButton}</div>
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
            title={collapsed ? "Log out" : undefined}
            aria-label="Log out"
          >
            <LogOut size={18} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
