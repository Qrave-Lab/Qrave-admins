"use client";

import { useEffect, useMemo, useState } from "react";
import OrdersChart from "@/components/OrdersChart";
import RangeTabs from "@/components/RangeTabs";
import RevenueChart from "@/components/RevenueChart";
import TopBar from "@/components/TopBar";
import { fetchRevenueSeries } from "@/lib/api";
import { RevenuePoint, RevenueRange } from "@/lib/types";

export default function RevenuePage() {
  const [range, setRange] = useState<RevenueRange>("month");
  const [series, setSeries] = useState<RevenuePoint[]>([]);

  useEffect(() => {
    void fetchRevenueSeries(range).then(setSeries);
  }, [range]);

  const totalRevenue = useMemo(() => series.reduce((sum, p) => sum + p.revenue, 0), [series]);
  const totalOrders = useMemo(() => series.reduce((sum, p) => sum + p.orders, 0), [series]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      <TopBar
        title={
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Revenue Analytics
          </h1>
        }
        subtitle={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Total revenue and order volume from all restaurants
          </div>
        }
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      {/* KPI Cards */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Revenue ({range})
          </p>
          <p className="mt-4 text-4xl font-black text-gray-900 tabular-nums">
            <span className="text-gray-400 mr-2 text-3xl">₹</span>
            {totalRevenue.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total Orders ({range})
          </p>
          <p className="mt-4 text-4xl font-black text-gray-900 tabular-nums">
            {totalOrders.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <div className="mt-8 px-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Revenue Trend */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            Revenue Trend
          </h3>
          <div className="h-72 w-full">
            <RevenueChart data={series} />
          </div>
        </section>

        {/* Order Volume */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            Order Volume
          </h3>
          <div className="h-72 w-full">
            <OrdersChart data={series} />
          </div>
        </section>
      </div>
    </div>
  );
}
