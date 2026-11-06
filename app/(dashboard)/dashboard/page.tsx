"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RangeTabs from "@/components/RangeTabs";
import TopBar from "@/components/TopBar";
import { fetchOverview, fetchRestaurants } from "@/lib/api";
import { Overview, RestaurantSummary, RevenueRange } from "@/lib/types";
import { ArrowUpRight, Radio } from "lucide-react";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const isAtRisk = (r: RestaurantSummary) => r.status === "churn-risk" || (r.churnSignals?.riskScore ?? 0) >= 45;
const statusStyle: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  trial: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  disabled: "bg-amber-50 text-amber-800 ring-amber-600/20",
  revoked: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function DashboardPage() {
  const [range, setRange] = useState<RevenueRange>("month");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const [o, r] = await Promise.all([
          fetchOverview(range),
          fetchRestaurants(range),
        ]);
        if (!mounted) return;
        setOverview(o);
        setRestaurants(
          r.sort((a, b) => (b.totalRevenueRange ?? 0) - (a.totalRevenueRange ?? 0))
        );
      } catch {
        if (!mounted) return;
        if (showLoading) {
          setOverview(null);
          setRestaurants([]);
        }
      } finally {
        if (showLoading && mounted) setLoading(false);
      }
    };

    void load(true);
    const timer = window.setInterval(() => void load(false), 8000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [range]);

  if (loading || !overview) {
    return (
      <div className="min-h-screen pb-12 w-full animate-pulse">
        <TopBar
          title={<div className="h-8 w-64 bg-slate-200 rounded-lg"></div>}
          subtitle={<div className="h-4 w-32 bg-slate-100 rounded mt-2"></div>}
        />
        
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 px-4 sm:px-6 xl:px-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <div className="h-3 w-20 bg-slate-100 rounded"></div>
                 <div className="h-8 w-8 bg-slate-50 rounded-lg"></div>
               </div>
               <div className="h-8 w-24 bg-slate-200 rounded-md"></div>
            </div>
          ))}
        </div>

        <section className="mt-12 px-4 sm:px-6 xl:px-8">
           <div className="h-8 w-48 bg-slate-200 rounded-md mb-6"></div>
           <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
             <div className="h-12 border-b border-slate-100 bg-slate-50/50"></div>
             {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-slate-50">
                   <div>
                     <div className="h-4 w-32 bg-slate-200 rounded mb-2"></div>
                     <div className="h-3 w-20 bg-slate-100 rounded"></div>
                   </div>
                   <div className="h-6 w-16 bg-slate-100 rounded-full"></div>
                </div>
             ))}
           </div>
        </section>
      </div>
    );
  }

  const atRisk = restaurants
    .filter(isAtRisk)
    .sort((a, b) => (b.churnSignals?.riskScore ?? 0) - (a.churnSignals?.riskScore ?? 0));
  const top = restaurants.slice(0, 8);
  const th = "px-4 py-3 text-left text-xs font-semibold text-slate-500";

  return (
    <div className="min-h-screen pb-12">
      <TopBar
        title="Business overview"
        subtitle={
          <div className="mt-1.5 flex items-center gap-2 text-sm font-medium text-brand-500">
            <Radio className="h-4 w-4 text-emerald-500" aria-hidden />
            Live, refreshes every 8 seconds · {range} view
          </div>
        }
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      <div className="mx-auto max-w-[1500px] space-y-8 px-4 py-6 sm:px-6 xl:px-8">
        <dl className="flex flex-wrap items-end gap-x-12 gap-y-5">
          <div>
            <dt className="text-sm font-semibold text-slate-500">Monthly recurring revenue</dt>
            <dd className="mt-1 text-5xl font-bold tracking-tight tabular-nums text-slate-900">{inr(overview.mrr ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Platform GMV ({range})</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{inr(overview.totalRevenueRange ?? 0)}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Active subscriptions</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
              {overview.activeRestaurants ?? 0}
              <span className="text-base font-semibold text-slate-400"> / {overview.totalRestaurants ?? 0}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Orders today</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{(overview.ordersToday ?? 0).toLocaleString("en-IN")}</dd>
          </div>
        </dl>

        {atRisk.length > 0 && (
          <section aria-labelledby="attention-heading" className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="attention-heading" className="text-lg font-bold tracking-tight text-slate-900">
                Needs attention <span className="tabular-nums text-rose-700">{atRisk.length}</span>
              </h2>
              <Link href="/restaurants" className="text-sm font-semibold text-slate-700 underline-offset-4 hover:underline">
                Review all restaurants
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-rose-100">
              {atRisk.slice(0, 5).map((r) => {
                const cs = r.churnSignals;
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-2.5">
                    <div className="min-w-0">
                      <Link href={`/restaurants/${r.id}`} className="font-semibold text-slate-900 hover:underline">
                        {r.brandName}
                      </Link>
                      <span className="text-sm text-slate-500"> · {r.locationName}</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {cs
                        ? cs.daysSinceLastOrder !== null
                          ? `${cs.daysSinceLastOrder} days since last order`
                          : "No orders yet"
                        : "Marked at risk"}
                      {cs && cs.deadQrScans7d > 0 && <span className="text-rose-700"> · {cs.deadQrScans7d} dead QR scans this week</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
            {atRisk.length > 5 && <p className="mt-2 text-sm text-slate-500">and {atRisk.length - 5} more.</p>}
          </section>
        )}

        <section aria-labelledby="top-heading">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 id="top-heading" className="text-lg font-bold tracking-tight text-slate-900">Top restaurants by revenue</h2>
            <Link href="/restaurants" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-900">
              All {restaurants.length} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          {top.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center">
              <p className="font-semibold text-slate-900">No restaurants yet</p>
              <Link href="/restaurants" className="mt-1 inline-block text-sm font-semibold text-slate-600 underline-offset-4 hover:underline">Create the first one</Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-slate-200 bg-slate-50/60">
                  <tr>
                    <th scope="col" className={th}>Restaurant</th>
                    <th scope="col" className={th}>Plan</th>
                    <th scope="col" className={th}>Status</th>
                    <th scope="col" className={`${th} text-right`}>Revenue ({range})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {top.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3.5">
                        <Link href={`/restaurants/${r.id}`} className="font-semibold text-slate-900 hover:underline">{r.brandName}</Link>
                        <p className="text-xs text-slate-500">{r.locationName}</p>
                      </td>
                      <td className="px-4 py-3.5 font-medium capitalize text-slate-700">{r.plan.replace("_", " ")}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyle[r.status] ?? "bg-rose-50 text-rose-700 ring-rose-600/20"}`}>
                          {r.status === "churn-risk" ? "At risk" : r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-slate-900">{inr(r.totalRevenueRange ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
