"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  Utensils,
  Tag,
  UserCheck,
  Building2,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode2,
} from "lucide-react";
import { AuditLogItem } from "@/lib/audit";

interface AuditStats {
  totalActions: number;
  todayActions: number;
  topQAdmin: string;
  categoryBreakdown: Record<string, number>;
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [category, setCategory] = useState("all");
  const [selectedQAdmin, setSelectedQAdmin] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  // Expanded items state for JSON inspector
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Unique list of qadmin usernames from current or fetched logs
  const [qadminOptions, setQadminOptions] = useState<Array<{ username: string; name?: string }>>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.set("category", category);
      if (selectedQAdmin) params.set("qadmin", selectedQAdmin);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      params.set("stats", "true");

      const res = await fetch(`/api/superadmin/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);

        // Populate qadmin options
        if (data.logs) {
          const map = new Map<string, string>();
          data.logs.forEach((item: AuditLogItem) => {
            if (item.qadminUsername && !map.has(item.qadminUsername)) {
              map.set(item.qadminUsername, item.qadminName || item.qadminUsername);
            }
          });
          setQadminOptions((prev) => {
            const combined = new Map<string, string>();
            prev.forEach((p) => combined.set(p.username, p.name || p.username));
            map.forEach((name, username) => combined.set(username, name));
            return Array.from(combined.entries()).map(([username, name]) => ({ username, name }));
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, selectedQAdmin, searchQuery, offset]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // Reset pagination when filter changes
  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setOffset(0);
  };

  const handleQAdminChange = (qa: string) => {
    setSelectedQAdmin(qa);
    setOffset(0);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setOffset(0);
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 45) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "RESTAURANT_STATUS_CHANGE":
        return { label: "Status Update", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "RESTAURANT_DELETE":
        return { label: "Restaurant Deleted", color: "bg-red-50 text-red-700 border-red-200" };
      case "RESTAURANT_CREATE":
        return { label: "Restaurant Onboarded", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      case "USER_STATUS_CHANGE":
        return { label: "User Status Changed", color: "bg-rose-50 text-rose-700 border-rose-200" };
      case "MENU_ITEM_CREATE":
        return { label: "Menu Item Added", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "MENU_ITEM_UPDATE":
        return { label: "Menu Item Edited", color: "bg-sky-50 text-sky-700 border-sky-200" };
      case "MENU_ITEM_DELETE":
        return { label: "Menu Item Removed", color: "bg-red-50 text-red-700 border-red-200" };
      case "DISCOUNT_CREATE":
        return { label: "Discount Issued", color: "bg-orange-50 text-orange-700 border-orange-200" };
      case "DISCOUNT_STATUS_CHANGE":
        return { label: "Discount Toggled", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "COUPON_TOGGLE":
        return { label: "Coupon Toggled", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "STAFF_ADD":
        return { label: "Staff Assigned", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "STAFF_UPDATE":
        return { label: "Staff Updated", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
      case "QADMIN_CREATE":
        return { label: "QAdmin Created", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "QADMIN_UPDATE":
        return { label: "QAdmin Updated", color: "bg-purple-50 text-purple-700 border-purple-200" };
      case "QADMIN_DELETE":
        return { label: "QAdmin Deleted", color: "bg-red-50 text-red-700 border-red-200" };
      case "FEEDBACK_RESPONSE":
        return { label: "Support Handled", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
      default:
        return { label: action.replace(/_/g, " "), color: "bg-slate-50 text-slate-700 border-slate-200" };
    }
  };

  const renderNarrative = (item: AuditLogItem) => {
    const actor = item.qadminName || item.qadminUsername;
    const target = item.entityName || item.entityId || "item";
    const details = item.details || {};

    switch (item.action) {
      case "RESTAURANT_STATUS_CHANGE": {
        const newStatus = details.new_status || details.status;
        const reason = details.reason;
        return (
          <span>
            Changed status of <strong className="text-slate-900 font-semibold">{target}</strong> to{" "}
            <span
              className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold uppercase ${
                newStatus === "active"
                  ? "bg-green-100 text-green-800"
                  : newStatus === "disabled"
                  ? "bg-amber-100 text-amber-800"
                  : newStatus === "revoked"
                  ? "bg-red-100 text-red-800"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {newStatus}
            </span>
            {reason ? (
              <span className="text-slate-500 ml-1.5 text-xs italic">
                (Reason: &ldquo;{reason}&rdquo;)
              </span>
            ) : null}
          </span>
        );
      }
      case "RESTAURANT_DELETE":
        return (
          <span>
            Permanently deleted restaurant <strong className="text-red-700 font-semibold">{target}</strong> and wiped all branch data.
          </span>
        );
      case "RESTAURANT_CREATE":
        return (
          <span>
            Onboarded new restaurant <strong className="text-slate-900 font-semibold">{target}</strong> with owner{" "}
            <span className="text-slate-600 font-medium">{details.owner_email || "-"}</span> on plan{" "}
            <span className="capitalize text-slate-800 font-semibold">{details.plan?.replace("_", " ")}</span>.
          </span>
        );
      case "USER_STATUS_CHANGE":
        return (
          <span>
            Updated access for staff/user <strong className="text-slate-900 font-semibold">{target}</strong> to{" "}
            <span className="font-semibold text-slate-800 uppercase">{details.new_status}</span>.
          </span>
        );
      case "MENU_ITEM_CREATE":
        return (
          <span>
            Added new menu item <strong className="text-slate-900 font-semibold">{target}</strong> priced at{" "}
            <span className="font-semibold text-slate-900">₹{details.price ?? "-"}</span>
            {details.restaurant_name ? (
              <span>
                {" "}for <span className="text-slate-700 font-medium">{details.restaurant_name}</span>
              </span>
            ) : null}
            .
          </span>
        );
      case "MENU_ITEM_UPDATE":
        return (
          <span>
            Modified menu item <strong className="text-slate-900 font-semibold">{target}</strong> (Price:{" "}
            <span className="font-semibold text-slate-900">₹{details.price ?? "-"}</span>, Available:{" "}
            <span className="font-medium">{details.is_available ? "Yes" : "No"}</span>)
            {details.restaurant_name ? (
              <span>
                {" "}for <span className="text-slate-700 font-medium">{details.restaurant_name}</span>
              </span>
            ) : null}
            .
          </span>
        );
      case "MENU_ITEM_DELETE":
        return (
          <span>
            Removed menu item <strong className="text-red-700 font-semibold">{target}</strong> from the restaurant catalog.
          </span>
        );
      case "DISCOUNT_CREATE":
        return (
          <span>
            Issued platform discount <strong className="text-slate-900 font-semibold">{target}</strong>
            {details.code ? (
              <>
                {" "}(Code: <code className="bg-slate-100 px-1 py-0.5 rounded text-orange-600 font-bold">{details.code}</code>)
              </>
            ) : null}{" "}
            giving{" "}
            <span className="font-bold text-slate-900">
              {details.discount_type === "percent" ? `${details.discount_value}% OFF` : `₹${details.discount_value} FLAT`}
            </span>
            .
          </span>
        );
      case "DISCOUNT_STATUS_CHANGE":
        return (
          <span>
            Toggled discount <strong className="text-slate-900 font-semibold">{target}</strong> to{" "}
            <span className={`font-bold ${details.is_active ? "text-emerald-700" : "text-slate-500"}`}>
              {details.is_active ? "ACTIVE" : "INACTIVE"}
            </span>
            .
          </span>
        );
      case "COUPON_TOGGLE":
        return (
          <span>
            Toggled campaign/coupon <strong className="text-slate-900 font-semibold">{target}</strong> to{" "}
            <span className={`font-bold ${details.is_active ? "text-emerald-700" : "text-slate-500"}`}>
              {details.is_active ? "ACTIVE" : "INACTIVE"}
            </span>
            .
          </span>
        );
      case "STAFF_ADD":
        return (
          <span>
            Assigned new team member <strong className="text-slate-900 font-semibold">{target}</strong> as{" "}
            <span className="capitalize font-semibold text-slate-800">{details.role || "staff"}</span>
            {details.restaurant_name ? (
              <span>
                {" "}to <span className="text-slate-700 font-medium">{details.restaurant_name}</span>
              </span>
            ) : null}
            .
          </span>
        );
      case "STAFF_UPDATE":
        return (
          <span>
            Updated staff member <strong className="text-slate-900 font-semibold">{target}</strong> to role{" "}
            <span className="capitalize font-semibold text-slate-800">{details.role}</span>.
          </span>
        );
      case "QADMIN_CREATE":
        return (
          <span>
            Created new operator account for <strong className="text-slate-900 font-semibold">{target}</strong> (
            <code>@{details.username}</code>) with role{" "}
            <span className="font-bold uppercase text-purple-700">{details.role || "admin"}</span>.
          </span>
        );
      case "QADMIN_UPDATE":
        return (
          <span>
            Edited operator profile for <strong className="text-slate-900 font-semibold">{target}</strong> (
            <code>@{details.username}</code>).
          </span>
        );
      case "QADMIN_DELETE":
        return (
          <span>
            Revoked and deleted operator account for <strong className="text-red-700 font-semibold">{target}</strong>.
          </span>
        );
      case "FEEDBACK_RESPONSE":
        return (
          <span>
            Managed support ticket <strong className="text-slate-900 font-semibold">{target}</strong> with status{" "}
            <span className="font-bold uppercase text-emerald-700">{details.status}</span>.
          </span>
        );
      default:
        return (
          <span>
            Performed <span className="font-medium text-slate-900">{item.action}</span> on{" "}
            <strong className="text-slate-900">{target}</strong>.
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Stats Cards ── */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Logged Actions</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalActions.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-500">Immutable ledger records</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actions Today</p>
            <p className="mt-1 text-2xl font-bold text-orange-600">{stats.todayActions}</p>
            <p className="mt-1 text-xs text-slate-500">Recorded since midnight</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Most Active Operator</p>
            <p className="mt-1 text-xl font-bold text-slate-900 truncate">{stats.topQAdmin || "N/A"}</p>
            <p className="mt-1 text-xs text-slate-500">Primary audit contributor</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4.5 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Audit Scope</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">100%</p>
            <p className="mt-1 text-xs text-slate-500">Status, Menu, Discounts & Access</p>
          </div>
        </div>
      )}

      {/* ── Filters & Controls ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          {[
            { id: "all", label: "All Activity" },
            { id: "restaurant_status", label: "Restaurant Status" },
            { id: "menu", label: "Menu Edits" },
            { id: "discounts", label: "Discounts & Coupons" },
            { id: "staff", label: "Staff Management" },
            { id: "qadmins", label: "Operator Accounts" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleCategoryChange(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-150 ${
                category === tab.id
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, QAdmin Dropdown & Refresh */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search target, dish, code, reason..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none transition-all"
              />
            </div>

            {/* QAdmin Filter Dropdown */}
            <div className="relative min-w-[160px]">
              <select
                value={selectedQAdmin}
                onChange={(e) => handleQAdminChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-3 pr-8 text-xs text-slate-800 focus:bg-white focus:border-slate-900 focus:outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">All QAdmins</option>
                {qadminOptions.map((opt) => (
                  <option key={opt.username} value={opt.username}>
                    {opt.name ? `${opt.name} (@${opt.username})` : `@${opt.username}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
            </div>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-orange-600" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Audit Logs Feed ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-orange-600 mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading audit trail records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Clock size={22} />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No audit events found</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || category !== "all" || selectedQAdmin
                ? "Try adjusting your search query or category filters to find records."
                : "Admin activity will be recorded here the moment any operator creates, updates, or disables entities."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((item) => {
              const badge = getActionBadge(item.action);
              const isExpanded = !!expandedIds[item.id];
              const actorInitials = (item.qadminName || item.qadminUsername || "QA")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors duration-150"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Avatar + Details */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Operator Avatar */}
                      <div
                        className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs"
                        title={item.qadminName ? `${item.qadminName} (@${item.qadminUsername})` : `@${item.qadminUsername}`}
                      >
                        {actorInitials}
                      </div>

                      {/* Main narrative block */}
                      <div className="space-y-1 min-w-0">
                        {/* Header: Actor info & badge */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-bold text-slate-900">
                            {item.qadminName || item.qadminUsername}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">
                            @{item.qadminUsername}
                          </span>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {/* Narrative */}
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {renderNarrative(item)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Timestamp & JSON toggle */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                      <span
                        className="text-xs font-medium text-slate-500 whitespace-nowrap"
                        title={new Date(item.createdAt).toLocaleString("en-IN")}
                      >
                        {formatRelativeTime(item.createdAt)}
                      </span>

                      {/* View Payload Toggle */}
                      {item.details && Object.keys(item.details).length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <FileCode2 size={12} />
                          <span>{isExpanded ? "Hide Data" : "Inspect"}</span>
                          <ChevronRight
                            size={12}
                            className={`transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && (
                    <div className="mt-3.5 ml-12 rounded-xl border border-slate-200 bg-slate-900 p-3.5 text-xs text-slate-200 font-mono overflow-x-auto shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2 text-slate-400 text-[11px]">
                        <span>EVENT_ID: {item.id}</span>
                        <span>ENTITY: {item.entityType.toUpperCase()} ({item.entityId || "N/A"})</span>
                      </div>
                      <pre className="text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
                        {JSON.stringify(item.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {total > limit && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-6">
            <span className="text-xs text-slate-500">
              Showing <strong className="font-semibold text-slate-800">{offset + 1}</strong> to{" "}
              <strong className="font-semibold text-slate-800">{Math.min(offset + limit, total)}</strong> of{" "}
              <strong className="font-semibold text-slate-800">{total}</strong> events
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={offset + limit >= total}
                onClick={() => setOffset((prev) => prev + limit)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
