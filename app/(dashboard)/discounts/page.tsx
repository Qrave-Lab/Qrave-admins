"use client";

import { useEffect, useState } from "react";
import { useCallback } from "react";
import TopBar from "@/components/TopBar";
import {
  createGlobalDiscount,
  fetchCouponCampaigns,
  fetchCouponRedemptions,
  fetchGlobalDiscounts,
  setGlobalDiscountStatus,
} from "@/lib/api";
import { CouponCampaign, CouponRedemption, GlobalDiscount } from "@/lib/types";

export default function GlobalDiscountsPage() {
  const [rows, setRows] = useState<GlobalDiscount[]>([]);
  const [campaigns, setCampaigns] = useState<CouponCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    discountType: "percent" as "percent" | "flat",
    discountValue: 10,
  });

  const load = useCallback(async () => {
    const [data, cp, red] = await Promise.all([
      fetchGlobalDiscounts(),
      fetchCouponCampaigns(),
      fetchCouponRedemptions(selectedCampaign || undefined),
    ]);
    setRows(data);
    setCampaigns(cp);
    setRedemptions(red);
  }, [selectedCampaign]);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const [data, cp, red] = await Promise.all([
          fetchGlobalDiscounts(),
          fetchCouponCampaigns(),
          fetchCouponRedemptions(),
        ]);
        if (mounted) {
          setRows(data);
          setCampaigns(cp);
          setRedemptions(red);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void boot();
    const timer = window.setInterval(() => {
      void load();
    }, 8000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [load]);

  return (
    <>
      <TopBar
        title="Global Discounts"
        subtitle="Platform-wide offers applied to all restaurants using Qrave."
      />

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <article className="rounded-2xl border border-white/50 bg-white/80 p-5 backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Create Platform Discount</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Offer name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Coupon code (optional)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              value={form.discountType}
              onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "percent" | "flat" }))}
            >
              <option value="percent">Percent</option>
              <option value="flat">Flat</option>
            </select>
            <input
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              type="number"
              min={1}
              value={form.discountValue}
              onChange={(e) => setForm((f) => ({ ...f, discountValue: Number(e.target.value || 0) }))}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={saving}
              onClick={async () => {
                if (!form.name.trim() || form.discountValue <= 0) return;
                setSaving(true);
                try {
                  await createGlobalDiscount({
                    name: form.name,
                    code: form.code || undefined,
                    discountType: form.discountType,
                    discountValue: form.discountValue,
                  });
                  await load();
                  setForm({ name: "", code: "", discountType: "percent", discountValue: 10 });
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving..." : "Create Discount"}
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-white/50 bg-white/80 p-5 backdrop-blur-md">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-700">Active & Past Global Discounts</h3>
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4">
                  <div className="flex-1"><div className="h-4 w-40 bg-slate-200 rounded mb-2" /><div className="h-3 w-24 bg-slate-100 rounded" /></div>
                  <div className="h-6 w-14 bg-slate-100 rounded-full" />
                  <div className="h-8 w-20 bg-slate-100 rounded-lg" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-sm text-slate-500">No global discounts configured yet.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/90 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{row.name}</p>
                    <p className="text-xs text-slate-500">
                      {row.discountType === "percent" ? `${row.discountValue}% off` : `₹${row.discountValue} off`}
                      {row.code ? ` • Code: ${row.code}` : " • Auto applied"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>
                    {row.isActive ? "Active" : "Paused"}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    onClick={async () => {
                      await setGlobalDiscountStatus(row.id, !row.isActive);
                      await load();
                    }}
                  >
                    {row.isActive ? "Pause" : "Activate"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-white/50 bg-white/80 p-5 backdrop-blur-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Coupon Redemptions</h3>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              <option value="">All coupon campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.couponCode || "NO-CODE"} · {c.name} · {c.restaurantName}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Redeemed</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{redemptions.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unique Restaurants</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{new Set(redemptions.map((r) => r.restaurantID)).size}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Discount Given</p>
              <p className="mt-1 text-xl font-bold text-slate-900">₹{redemptions.reduce((s, r) => s + r.discountAmount, 0).toLocaleString("en-IN")}</p>
            </div>
          </div>

          {redemptions.length === 0 ? (
            <div className="py-8 text-sm text-slate-500">No redemptions found for this selection.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Coupon</th>
                    <th className="px-2 py-2">Campaign</th>
                    <th className="px-2 py-2">Restaurant</th>
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Discount</th>
                    <th className="px-2 py-2">Redeemed At</th>
                  </tr>
                </thead>
                <tbody>
                  {redemptions.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-800">{row.codeUsed}</td>
                      <td className="px-2 py-2 text-slate-700">{row.campaignName}</td>
                      <td className="px-2 py-2 text-slate-700">{row.restaurantName}</td>
                      <td className="px-2 py-2 text-slate-700 font-mono text-xs">{row.orderID}</td>
                      <td className="px-2 py-2 text-slate-700">{row.orderStatus || "-"}</td>
                      <td className="px-2 py-2 text-slate-700">₹{row.discountAmount.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2 text-slate-600">{new Date(row.redeemedAt).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
