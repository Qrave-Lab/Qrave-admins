"use client";

import { notify, confirmAction } from "@/lib/ui/feedback";

import { useEffect, useState } from "react";
import { BroadcastBanner, BROADCAST_PRESETS, BroadcastPreset, BroadcastSeverity } from "@/lib/broadcasts";
import {
  AlertTriangle,
  Megaphone,
  Plus,
  Power,
  Trash2,
  Clock,
  Globe,
  Store,
  Users,
  CheckCircle2,
  X,
  Loader2,
} from "lucide-react";

interface Props {
  restaurants?: Array<{ id: string; name: string }>;
}

export default function BroadcastBannerManager({ restaurants = [] }: Props) {
  const [broadcasts, setBroadcasts] = useState<BroadcastBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New Banner Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<BroadcastSeverity>("warning");
  const [scope, setScope] = useState<"global" | "restaurant">("global");
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [targetAudience, setTargetAudience] = useState<"all" | "diners" | "staff">("all");
  const [expiresInHours, setExpiresInHours] = useState<string>("4");

  useEffect(() => {
    void fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/broadcasts");
      if (res.ok) {
        const data = await res.json();
        setBroadcasts(data.broadcasts || []);
      }
    } catch (err) {
      console.error("Failed to fetch broadcasts:", err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (preset: BroadcastPreset) => {
    setTitle(preset.title);
    setMessage(preset.message);
    setSeverity(preset.severity);
    setTargetAudience(preset.target_audience);
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      notify.error("Title and message are required.");
      return;
    }

    if (scope === "restaurant" && !restaurantId) {
      notify.error("Please select a target restaurant.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          severity,
          scope,
          restaurantId: scope === "restaurant" ? restaurantId : null,
          targetAudience,
          expiresInHours: Number(expiresInHours) || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to create broadcast banner");

      await fetchBroadcasts();
      setModalOpen(false);
      setTitle("");
      setMessage("");
    } catch (err: any) {
      notify.error(err.message || "Failed to publish broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (banner: BroadcastBanner) => {
    try {
      const nextActive = !banner.is_active;
      // Optimistic update
      setBroadcasts((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: nextActive } : b)),
      );

      const res = await fetch(`/api/superadmin/broadcasts/${banner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });

      if (!res.ok) throw new Error("Update failed");
      void fetchBroadcasts();
    } catch {
      notify.error("Failed to toggle banner status");
      void fetchBroadcasts();
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: "Delete broadcast banner?", message: "It will disappear for every restaurant it targets. This can't be undone.", confirmLabel: "Delete banner" }))) return;
    try {
      setBroadcasts((prev) => prev.filter((b) => b.id !== id));
      await fetch(`/api/superadmin/broadcasts/${id}`, { method: "DELETE" });
      void fetchBroadcasts();
    } catch {
      notify.error("Failed to delete banner");
      void fetchBroadcasts();
    }
  };

  const activeCount = broadcasts.filter(
    (b) => b.is_active && (!b.expires_at || new Date(b.expires_at) > new Date()),
  ).length;

  const criticalCount = broadcasts.filter(
    (b) =>
      b.is_active &&
      b.severity === "critical" &&
      (!b.expires_at || new Date(b.expires_at) > new Date()),
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Active Critical Banner Alert ── */}
      {criticalCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white font-bold">
              <AlertTriangle size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-rose-950">
                Active Critical Broadcast Live ({criticalCount})
              </p>
              <p className="text-xs text-rose-800">
                Platform or store-scoped critical maintenance banners are currently visible to live diners and staff.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-rose-200 px-3 py-1 text-xs font-bold text-rose-900 animate-pulse">
            Live Incident
          </span>
        </div>
      )}

      {/* ── Summary & Action Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-slate-900" />
            <h3 className="text-base font-bold text-slate-900">Emergency Broadcast & Platform Status Banners</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Push real-time incident notices, UPI warnings, or maintenance schedules to diner menus and POS terminals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs">
            <span className="text-slate-500">Live Active:</span>
            <span className="font-bold text-slate-900">{activeCount}</span>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-colors"
          >
            <Plus size={15} />
            <span>Publish Broadcast</span>
          </button>
        </div>
      </div>

      {/* ── Broadcasts List ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading broadcasts...</div>
        ) : broadcasts.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No broadcast banners recorded. Click &quot;Publish Broadcast&quot; to issue an incident notice.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {broadcasts.map((b) => {
              const isLive = b.is_active && (!b.expires_at || new Date(b.expires_at) > new Date());
              return (
                <div
                  key={b.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 transition-colors ${
                    isLive ? "bg-white" : "bg-slate-50/50 opacity-70"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity badge */}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          b.severity === "critical"
                            ? "bg-rose-600 text-white"
                            : b.severity === "warning"
                            ? "bg-amber-500 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {b.severity}
                      </span>

                      {/* Status */}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                          isLive
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isLive ? "● Live / Broadcasting" : "Inactive / Resolved"}
                      </span>

                      {/* Scope */}
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                        {b.scope === "global" ? <Globe size={11} /> : <Store size={11} />}
                        <span>{b.scope === "global" ? "Global Platform" : b.restaurant_name || "Specific Store"}</span>
                      </span>

                      {/* Audience */}
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
                        <Users size={11} />
                        <span className="capitalize">{b.target_audience}</span>
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{b.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{b.message}</p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span>Published by: <span className="font-semibold text-slate-600">{b.created_by}</span></span>
                      <span>Started: {new Date(b.starts_at).toLocaleString()}</span>
                      {b.expires_at && (
                        <span>Expires: {new Date(b.expires_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(b)}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors ${
                        b.is_active
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Power size={13} />
                      <span>{b.is_active ? "Live (Turn Off)" : "Activate"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.id)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors"
                      title="Delete Broadcast"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Broadcast Modal ── */}
      {modalOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Publish Emergency Broadcast Banner</h3>
                <p className="text-xs text-slate-500">Live banner will immediately display on diner menus and POS</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Quick Incident Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BROADCAST_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Message */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Banner Headline *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. UPI Payment Gateway Degradation"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Detailed Advisory Message *
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explain the disruption and instructions (e.g. 'Use Card or Counter Cash')..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              {/* Severity & Scope Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as BroadcastSeverity)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="critical">Critical (Red - High Alert / Outage)</option>
                    <option value="warning">Warning (Amber - Degradation / Delay)</option>
                    <option value="info">Info (Blue - General Notice)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="all">All (Diners & Restaurant Staff)</option>
                    <option value="diners">Diners Only (QR Web Menus)</option>
                    <option value="staff">Staff Only (Waiter & POS Terminals)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Scope
                  </label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="global">Global Platform (All Restaurants)</option>
                    <option value="restaurant">Single Store Scoped</option>
                  </select>
                </div>

                {scope === "restaurant" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Restaurant *
                    </label>
                    <select
                      value={restaurantId}
                      onChange={(e) => setRestaurantId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                    >
                      <option value="">Select Store...</option>
                      {restaurants.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auto-Dismiss Duration
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="1">1 Hour</option>
                    <option value="4">4 Hours (Standard Incident)</option>
                    <option value="12">12 Hours</option>
                    <option value="24">24 Hours</option>
                    <option value="0">Until Manually Dismissed</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCreate}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Megaphone size={15} />}
                <span>{submitting ? "Publishing..." : "Publish Banner"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
