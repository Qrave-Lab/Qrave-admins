"use client";

import { useEffect, useMemo, useState } from "react";
import RangeTabs from "@/components/RangeTabs";
import TopBar from "@/components/TopBar";
import { fetchOverview, fetchRestaurants } from "@/lib/api";
import { Overview, RestaurantSummary, RevenueRange } from "@/lib/types";

type PlanKey = "starter" | "growth" | "pro";

const planLabel: Record<PlanKey, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

export default function AnalyticsPage() {
  const [range, setRange] = useState<RevenueRange>("month");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const [o, r] = await Promise.all([fetchOverview(range), fetchRestaurants(range)]);
        if (!mounted) return;
        setOverview(o);
        setRestaurants(r);
      } finally {
        if (showLoading && mounted) setLoading(false);
      }
    };

    void load(true);
    const timer = window.setInterval(() => {
      void load(false);
    }, 8000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [range]);

  const mrr = useMemo(
    () => restaurants.filter((r) => r.status === "active" || r.status === "trial").reduce((sum, r) => sum + r.mrr, 0),
    [restaurants],
  );
  const arr = mrr * 12;
  const atRiskMRR = useMemo(
    () => restaurants.filter((r) => r.status === "churn-risk" || r.status === "disabled" || r.status === "revoked").reduce((sum, r) => sum + r.mrr, 0),
    [restaurants],
  );
  const avgMRR = restaurants.length > 0 ? Math.round(mrr / restaurants.length) : 0;

  const planRows = useMemo(() => {
    const seed: Record<PlanKey, { count: number; mrr: number }> = {
      starter: { count: 0, mrr: 0 },
      growth: { count: 0, mrr: 0 },
      pro: { count: 0, mrr: 0 },
    };
    for (const row of restaurants) {
      seed[row.plan].count += 1;
      seed[row.plan].mrr += row.mrr;
    }
    return (Object.keys(seed) as PlanKey[]).map((key) => {
      const contribution = mrr > 0 ? Math.round((seed[key].mrr / mrr) * 100) : 0;
      return {
        key,
        label: planLabel[key],
        count: seed[key].count,
        mrr: seed[key].mrr,
        arr: seed[key].mrr * 12,
        contribution,
      };
    });
  }, [restaurants, mrr]);

  if (loading || !overview) {
    return (
      <>
        <TopBar
          title="Subscription Analytics"
          subtitle="Plan mix, MRR, yearly run-rate, and subscription risk across all restaurants."
          rightSlot={<RangeTabs value={range} onChange={setRange} />}
        />
        <section className="px-6 py-8 max-w-7xl mx-auto space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="h-3 w-1/2 bg-slate-200 rounded mb-4" />
                <div className="h-8 w-3/4 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white shadow-sm h-64 w-full" />
        </section>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Subscription Analytics"
        subtitle="Plan mix, MRR, yearly run-rate, and subscription risk across all restaurants."
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      <section className="px-6 py-8 max-w-7xl mx-auto space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Monthly Recurring Revenue</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">₹{mrr.toLocaleString("en-IN")}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Annualized Run Rate</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">₹{arr.toLocaleString("en-IN")}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Average MRR / Restaurant</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">₹{avgMRR.toLocaleString("en-IN")}</p>
          </article>
          <article className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">At-Risk MRR</p>
            <p className="mt-2 text-3xl font-bold text-red-700">₹{atRiskMRR.toLocaleString("en-IN")}</p>
          </article>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white">
          <header className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Plan Distribution</h3>
          </header>
          <div className="overflow-hidden">
            <table className="min-w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[24%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Plan</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Restaurants</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">MRR</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Yearly Value</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">MRR Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {planRows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{row.label}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{row.count}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">₹{row.mrr.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">₹{row.arr.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{row.contribution}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total Restaurants</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{overview.totalRestaurants}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active + Trial</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{overview.activeRestaurants + overview.trialRestaurants}</p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Billing View</p>
            <p className="mt-2 text-sm text-gray-700">
              Monthly recurring tracked as MRR. Yearly view shown as annualized run-rate (MRR × 12).
            </p>
          </article>
        </section>
      </section>
    </>
  );
}

