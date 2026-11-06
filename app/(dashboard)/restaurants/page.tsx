"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  CornerDownRight,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import RangeTabs from "@/components/RangeTabs";
import TopBar from "@/components/TopBar";
import RestaurantOnboardingWizard from "@/components/RestaurantOnboardingWizard";
import TableQrPackModal from "@/components/TableQrPackModal";
import { deleteRestaurant, fetchRestaurants, updateRestaurantStatus } from "@/lib/api";
import { RestaurantStatus, RestaurantSummary, RevenueRange } from "@/lib/types";
import { confirmAction, notify } from "@/lib/ui/feedback";

type Filter = "all" | "active" | "trial" | "churn-risk" | "disabled";
type SortKey = "revenue" | "name" | "newest" | "risk";
type SavedView = { name: string; filter: Filter; query: string; sort: SortKey };
type Row = { r: RestaurantSummary; branchOf?: string };

const SAVED_VIEWS_KEY = "qrave.sa.restaurants.views";
const isAtRisk = (r: RestaurantSummary) => r.status === "churn-risk" || (r.churnSignals?.riskScore ?? 0) >= 45;

const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  trial: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  disabled: "bg-amber-50 text-amber-800 ring-amber-600/20",
  revoked: "bg-red-50 text-red-700 ring-red-600/20",
  "churn-risk": "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const riskStyle: Record<string, string> = {
  critical: "text-rose-700",
  high: "text-orange-700",
  moderate: "text-amber-700",
  low: "text-slate-500",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function RowMenu({
  r,
  busy,
  onStatus,
  onQr,
  onDelete,
}: {
  r: RestaurantSummary;
  busy: boolean;
  onStatus: (s: RestaurantStatus) => void;
  onQr: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent";
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`More actions for ${r.brandName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <MoreHorizontal size={16} />}
      </button>
      {open && (
        <div role="menu" className="modal-in absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button role="menuitem" className={item} onClick={run(onQr)}>
            <Printer size={14} aria-hidden /> Print QR pack
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button role="menuitem" className={item} disabled={r.status === "active"} onClick={run(() => onStatus("active"))}>
            Activate
          </button>
          <button role="menuitem" className={item} disabled={r.status === "disabled"} onClick={run(() => onStatus("disabled"))}>
            Disable
          </button>
          <button role="menuitem" className={`${item} text-red-700`} disabled={r.status === "revoked"} onClick={run(() => onStatus("revoked"))}>
            Revoke access
          </button>
          <div className="my-1 h-px bg-slate-100" />
          <button role="menuitem" className={`${item} text-red-700`} onClick={run(onDelete)}>
            <Trash2 size={14} aria-hidden /> Delete…
          </button>
        </div>
      )}
    </div>
  );
}

export default function RestaurantsPage() {
  const [range, setRange] = useState<RevenueRange>("month");
  const [rows, setRows] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [qrPackTarget, setQrPackTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RestaurantSummary | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [views, setViews] = useState<SavedView[]>([]);
  const [savingView, setSavingView] = useState(false);
  const [viewName, setViewName] = useState("");

  useEffect(() => {
    try {
      setViews(JSON.parse(window.localStorage.getItem(SAVED_VIEWS_KEY) ?? "[]"));
    } catch {
      setViews([]);
    }
  }, []);

  const persistViews = (next: SavedView[]) => {
    setViews(next);
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    let mounted = true;
    const load = async (first: boolean) => {
      if (first) setLoading(true);
      try {
        const data = await fetchRestaurants(range);
        if (!mounted) return;
        setRows(data);
        setLoadFailed(false);
      } catch {
        if (mounted && first) setLoadFailed(true);
      } finally {
        if (mounted && first) setLoading(false);
      }
    };
    void load(true);
    const timer = window.setInterval(() => void load(false), 8000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [range]);

  const totals = useMemo(
    () => ({
      active: rows.filter((r) => r.status === "active").length,
      trial: rows.filter((r) => r.status === "trial").length,
      disabled: rows.filter((r) => r.status === "disabled" || r.status === "revoked").length,
      atRisk: rows.filter(isAtRisk).length,
      mrr: rows.reduce((s, r) => s + r.mrr, 0),
    }),
    [rows]
  );

  /** Filter, sort, then keep branches of the same owner together under their oldest branch. */
  const table: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (filter === "churn-risk" ? !isAtRisk(r) : filter === "disabled" ? !(r.status === "disabled" || r.status === "revoked") : filter !== "all" && r.status !== filter) return false;
      return !q || [r.brandName, r.locationName, r.ownerEmail ?? ""].some((v) => v.toLowerCase().includes(q));
    });

    const cmp: Record<SortKey, (a: RestaurantSummary, b: RestaurantSummary) => number> = {
      revenue: (a, b) => b.totalRevenueRange - a.totalRevenueRange,
      name: (a, b) => a.brandName.localeCompare(b.brandName),
      newest: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      risk: (a, b) => (b.churnSignals?.riskScore ?? 0) - (a.churnSignals?.riskScore ?? 0),
    };

    const byOwner = new Map<string, RestaurantSummary[]>();
    const loose: RestaurantSummary[] = [];
    list.forEach((r) => {
      if (!r.ownerEmail) return loose.push(r);
      byOwner.set(r.ownerEmail, [...(byOwner.get(r.ownerEmail) ?? []), r]);
    });

    const blocks: RestaurantSummary[][] = [...loose.map((r) => [r])];
    byOwner.forEach((group) => {
      const sorted = [...group].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      blocks.push(sorted);
    });
    blocks.sort((a, b) => cmp[sort](a[0], b[0]));

    return blocks.flatMap((block) => block.map((r, i): Row => ({ r, branchOf: i > 0 ? block[0].brandName : undefined })));
  }, [rows, query, filter, sort]);

  const visibleIds = table.map((t) => t.r.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const selectedRows = rows.filter((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const applyStatus = async (targets: RestaurantSummary[], status: RestaurantStatus) => {
    if (targets.length === 0) return;
    if (status === "revoked") {
      const ok = await confirmAction({
        title: targets.length > 1 ? `Revoke ${targets.length} restaurants?` : `Revoke ${targets[0].brandName}?`,
        message: "Staff and customers lose access immediately. You can re-activate later.",
        confirmLabel: "Revoke access",
      });
      if (!ok) return;
    }
    const ids = new Set(targets.map((t) => t.id));
    const snapshot = rows;
    setPending((p) => new Set([...p, ...ids]));
    setRows((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, status } : r)));

    const results = await Promise.allSettled(targets.map((t) => updateRestaurantStatus(t.id, status)));
    const failedIds = new Set(targets.filter((_, i) => results[i].status === "rejected").map((t) => t.id));
    if (failedIds.size > 0) setRows((prev) => prev.map((r) => (failedIds.has(r.id) ? snapshot.find((s) => s.id === r.id) ?? r : r)));
    setPending((p) => new Set([...p].filter((id) => !ids.has(id))));

    const done = targets.length - failedIds.size;
    const verb = status === "active" ? "activated" : status === "disabled" ? "disabled" : "revoked";
    if (done > 0) notify.success(done === 1 ? `${targets.find((t) => !failedIds.has(t.id))!.brandName} ${verb}.` : `${done} restaurants ${verb}.`);
    if (failedIds.size > 0) notify.error(`Couldn't update ${failedIds.size} restaurant${failedIds.size > 1 ? "s" : ""}. Try again.`);
    setSelected(new Set());
  };

  const submitDelete = async () => {
    if (!deleteTarget || deleteText !== "DELETE") return;
    setDeleteBusy(true);
    try {
      await deleteRestaurant(deleteTarget.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      notify.success(`${deleteTarget.brandName} deleted.`);
      setDeleteTarget(null);
      setDeleteText("");
    } catch (e) {
      console.error(e);
      notify.error("Couldn't delete the restaurant. Nothing was removed.");
    } finally {
      setDeleteBusy(false);
    }
  };

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: rows.length },
    { id: "active", label: "Active", count: totals.active },
    { id: "trial", label: "Trial", count: totals.trial },
    { id: "churn-risk", label: "At risk", count: totals.atRisk },
    { id: "disabled", label: "Disabled", count: totals.disabled },
  ];

  const isFiltered = filter !== "all" || query.trim() !== "";
  const th = "px-4 py-3 text-left text-xs font-semibold text-slate-500";

  return (
    <>
      <TopBar
        title="Restaurants"
        subtitle="Branch access, subscription health and churn signals."
        rightSlot={
          <>
            <RangeTabs value={range} onChange={setRange} />
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              <Plus size={16} aria-hidden /> Create restaurant
            </button>
          </>
        }
      />

      <section className="mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-6 xl:px-8">
        <dl className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          <div>
            <dt className="text-xs font-semibold text-slate-500">Restaurants</dt>
            <dd className="text-2xl font-bold tabular-nums text-slate-900">{rows.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">Active</dt>
            <dd className="text-2xl font-bold tabular-nums text-emerald-700">{totals.active}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">MRR</dt>
            <dd className="text-2xl font-bold tabular-nums text-slate-900">{inr(totals.mrr)}</dd>
          </div>
          {totals.atRisk > 0 && (
            <div>
              <dt className="text-xs font-semibold text-slate-500">At risk</dt>
              <dd>
                <button
                  type="button"
                  onClick={() => setFilter(filter === "churn-risk" ? "all" : "churn-risk")}
                  className="text-2xl font-bold tabular-nums text-rose-700 underline-offset-4 hover:underline"
                >
                  {totals.atRisk}
                </button>
              </dd>
            </div>
          )}
        </dl>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              aria-label="Search restaurants"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              placeholder="Search brand, location or owner email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                    filter === f.id ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {f.label}
                  {f.count !== undefined && <span className={`ml-1.5 tabular-nums ${filter === f.id ? "text-slate-300" : "text-slate-400"}`}>{f.count}</span>}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-500">
              <span className="sr-only sm:not-sr-only">Sort</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700"
              >
                <option value="revenue">Revenue</option>
                <option value="name">Name</option>
                <option value="newest">Newest</option>
                <option value="risk">Churn risk</option>
              </select>
            </label>
          </div>
        </div>

        {(views.length > 0 || isFiltered) && (
          <div className="flex flex-wrap items-center gap-2">
            <Bookmark size={14} className="text-slate-400" aria-hidden />
            <span className="sr-only">Saved views</span>
            {views.map((v) => (
              <span key={v.name} className="inline-flex items-center rounded-full border border-slate-200 bg-white text-sm font-medium text-slate-700">
                <button
                  type="button"
                  className="rounded-l-full py-1 pl-3 pr-2 hover:bg-slate-50"
                  onClick={() => {
                    setFilter(v.filter);
                    setQuery(v.query);
                    setSort(v.sort);
                  }}
                >
                  {v.name}
                </button>
                <button
                  type="button"
                  aria-label={`Delete saved view ${v.name}`}
                  className="rounded-r-full py-1 pl-1 pr-2 text-slate-400 hover:text-red-600"
                  onClick={() => persistViews(views.filter((x) => x.name !== v.name))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {isFiltered && !savingView && (
              <button type="button" onClick={() => setSavingView(true)} className="text-sm font-semibold text-slate-600 underline-offset-4 hover:underline">
                Save this view
              </button>
            )}
            {savingView && (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const name = viewName.trim();
                  if (!name) return;
                  persistViews([...views.filter((v) => v.name !== name), { name, filter, query, sort }]);
                  notify.success(`Saved view “${name}”.`);
                  setSavingView(false);
                  setViewName("");
                }}
              >
                <input
                  autoFocus
                  aria-label="View name"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="Name this view"
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
                <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white">Save</button>
                <button type="button" onClick={() => setSavingView(false)} className="text-sm font-semibold text-slate-500">Cancel</button>
              </form>
            )}
          </div>
        )}

        {selected.size > 0 && (
          <div role="region" aria-label="Bulk actions" className="modal-in sticky top-[88px] z-20 flex flex-wrap items-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
            <span className="mr-2 font-semibold tabular-nums">{selected.size} selected</span>
            <button type="button" onClick={() => void applyStatus(selectedRows, "active")} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">Activate</button>
            <button type="button" onClick={() => void applyStatus(selectedRows, "disabled")} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">Disable</button>
            <button type="button" onClick={() => void applyStatus(selectedRows, "revoked")} className="rounded-lg bg-red-500/90 px-3 py-1.5 font-semibold hover:bg-red-500">Revoke</button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto rounded-lg px-3 py-1.5 font-semibold text-slate-300 hover:text-white">Clear</button>
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading restaurants…
          </div>
        ) : loadFailed && rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <p className="font-semibold text-slate-900">Couldn’t load restaurants</p>
            <p className="mt-1 text-sm text-slate-500">Check your connection and try again.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
              Reload
            </button>
          </div>
        ) : table.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
            <p className="font-semibold text-slate-900">{isFiltered ? "No restaurants match these filters" : "No restaurants yet"}</p>
            <p className="mt-1 text-sm text-slate-500">{isFiltered ? "Try a different search or status." : "Create the first restaurant to get started."}</p>
            {isFiltered ? (
              <button type="button" onClick={() => { setFilter("all"); setQuery(""); }} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                Clear filters
              </button>
            ) : (
              <button type="button" onClick={() => setCreateOpen(true)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Create restaurant
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/60">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all visible restaurants"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(visibleIds))}
                      className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                    />
                  </th>
                  <th scope="col" className={th}>Restaurant</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={th}>Plan</th>
                  <th scope="col" className={`${th} text-right`}>Revenue ({range})</th>
                  <th scope="col" className={th}>Churn risk</th>
                  <th scope="col" className="w-40 px-4 py-3 text-right text-xs font-semibold text-slate-500"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.map(({ r, branchOf }) => {
                  const busy = pending.has(r.id);
                  const cs = r.churnSignals;
                  return (
                    <tr key={r.id} className={selected.has(r.id) ? "bg-slate-50" : "hover:bg-slate-50/60"}>
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.brandName} ${r.locationName}`}
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`flex items-start gap-2 ${branchOf ? "pl-3" : ""}`}>
                          {branchOf && <CornerDownRight size={14} className="mt-1 shrink-0 text-slate-300" aria-label={`Branch of ${branchOf}`} />}
                          <div className="min-w-0">
                            <Link href={`/restaurants/${r.id}`} className="block truncate font-semibold text-slate-900 hover:underline">
                              {r.brandName}
                            </Link>
                            <p className="truncate text-xs text-slate-500">
                              {r.locationName}
                              {r.ownerEmail && <span> · {r.ownerEmail}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyle[r.status] ?? statusStyle["churn-risk"]}`}>
                          {r.status === "churn-risk" ? "At risk" : r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-medium capitalize text-slate-700">{r.plan}</td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900">{inr(r.totalRevenueRange)}</td>
                      <td className="px-4 py-3.5">
                        {cs ? (
                          <div>
                            <span className={`text-sm font-semibold capitalize ${riskStyle[cs.riskLevel] ?? "text-slate-500"}`}>
                              {cs.riskLevel} <span className="tabular-nums font-medium text-slate-400">{cs.riskScore}</span>
                            </span>
                            <p className="text-xs text-slate-500" title={cs.deadQrScans7d > 0 ? "Table sessions started with zero orders placed" : undefined}>
                              {cs.daysSinceLastOrder !== null ? `${cs.daysSinceLastOrder}d since last order` : "No orders yet"}
                              {cs.deadQrScans7d > 0 && <span className="text-rose-600"> · {cs.deadQrScans7d} dead scans</span>}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/restaurants/${r.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                            Open
                          </Link>
                          <RowMenu
                            r={r}
                            busy={busy}
                            onStatus={(s) => void applyStatus([r], s)}
                            onQr={() => setQrPackTarget({ id: r.id, name: r.brandName || r.locationName || "Restaurant" })}
                            onDelete={() => {
                              setDeleteText("");
                              setDeleteTarget(r);
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <RestaurantOnboardingWizard
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          notify.success("Restaurant created.");
          void fetchRestaurants(range).then(setRows);
        }}
      />

      {qrPackTarget && (
        <TableQrPackModal restaurantId={qrPackTarget.id} restaurantName={qrPackTarget.name} onClose={() => setQrPackTarget(null)} />
      )}

      {deleteTarget && (
        <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="modal-in w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h2 id="delete-title" className="text-lg font-bold tracking-tight text-slate-900">
                Delete {deleteTarget.brandName}?
              </h2>
              <button type="button" aria-label="Close" onClick={() => setDeleteTarget(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              This permanently removes {deleteTarget.locationName}, including its users, menu and orders. It can’t be undone.
            </p>
            <label htmlFor="delete-confirm" className="mt-4 block text-sm font-semibold text-slate-700">
              Type <span className="font-mono">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              autoFocus
              autoComplete="off"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submitDelete()}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy || deleteText !== "DELETE"}
                onClick={() => void submitDelete()}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteBusy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                {deleteBusy ? "Deleting…" : "Delete restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
