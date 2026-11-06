"use client";

import { useEffect, useMemo, useState } from "react";
import RangeTabs from "@/components/RangeTabs";
import TopBar from "@/components/TopBar";
import { fetchOverview, fetchRestaurants } from "@/lib/api";
import { Overview, RestaurantSummary, RevenueRange } from "@/lib/types";

type PlanKey = "starter" | "growth" | "pro" | "enterprise";

const planLabel: Record<PlanKey, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  enterprise: "Enterprise",
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
      enterprise: { count: 0, mrr: 0 },
    };
    for (const row of restaurants) {
      const p = (row.plan in seed ? row.plan : "starter") as PlanKey;
      seed[p].count += 1;
      seed[p].mrr += row.mrr;
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
          title="Subscriptions"
          subtitle="Plan mix, MRR, run-rate and subscription risk."
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
        title="Subscriptions"
        subtitle="Plan mix, MRR, run-rate and subscription risk."
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      <section className="px-4 py-6 sm:px-6 xl:px-8 max-w-[1500px] mx-auto space-y-6">
        <dl className="flex flex-wrap items-end gap-x-12 gap-y-4">
          <div>
            <dt className="text-sm font-semibold text-slate-500">Monthly recurring revenue</dt>
            <dd className="mt-1 text-4xl font-bold tracking-tight tabular-nums text-slate-900">₹{mrr.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Annualized run rate</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">₹{arr.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Average MRR per restaurant</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">₹{avgMRR.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">At-risk MRR</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-red-700">₹{atRiskMRR.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Active and trial</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {overview.activeRestaurants + overview.trialRestaurants}
              <span className="text-base font-semibold text-slate-400"> / {overview.totalRestaurants}</span>
            </dd>
          </div>
        </dl>

        <section className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <header className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-base font-bold tracking-tight text-slate-900">Plan distribution</h3>
          </header>
          <div className="overflow-hidden">
            <table className="min-w-[560px] w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[24%] px-5 py-3 text-left text-xs font-semibold text-slate-500">Plan</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold text-slate-500">Restaurants</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold text-slate-500">MRR</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold text-slate-500">Yearly Value</th>
                  <th className="w-[19%] px-5 py-3 text-left text-xs font-semibold text-slate-500">MRR Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {planRows.map((row) => (
                  <tr key={row.key}>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{row.label}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-700">{row.count}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-700">₹{row.mrr.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-700">₹{row.arr.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-700">{row.contribution}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-sm text-slate-500">MRR is the monthly recurring total. The yearly view is annualized run rate (MRR × 12).</p>
      </section>
    </>
  );
}

