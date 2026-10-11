"use client";

import { useEffect, useMemo, useState } from "react";
import OrdersChart from "@/components/OrdersChart";
import RangeTabs from "@/components/RangeTabs";
import RevenueChart from "@/components/RevenueChart";
import TopBar from "@/components/TopBar";
import AccountantExportModal from "@/components/AccountantExportModal";
import { fetchRevenueSeries, fetchRestaurants } from "@/lib/api";
import { RevenuePoint, RevenueRange } from "@/lib/types";
import { FileSpreadsheet, Download, Receipt, DollarSign, Percent } from "lucide-react";

export default function RevenuePage() {
  const [range, setRange] = useState<RevenueRange>("month");
  const [series, setSeries] = useState<RevenuePoint[]>([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [restaurants, setRestaurants] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    void fetchRevenueSeries(range).then(setSeries);
    void fetchRestaurants("month").then((res) => {
      setRestaurants(res.map((r) => ({ id: r.id, name: `${r.brandName} (${r.locationName})` })));
    });
  }, [range]);

  const totalRevenue = useMemo(() => series.reduce((sum, p) => sum + p.revenue, 0), [series]);
  const totalOrders = useMemo(() => series.reduce((sum, p) => sum + p.orders, 0), [series]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <TopBar
        title={
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Revenue Analytics & Accountant Reconciliation
          </h1>
        }
        subtitle={
          <div className="flex items-center gap-2 text-sm text-gray-500">
            Total revenue, transaction flow, tax schedules, and financial exports
          </div>
        }
        rightSlot={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export for Accountant
            </button>
            <RangeTabs value={range} onChange={setRange} />
          </div>
        }
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

      {/* Accountant & Financial Filing Reports */}
      <section className="mt-8 px-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Financial Reports & Accountant CSV Filings
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                One-click CSV downloads formatted for accounting ledgers, bank reconciliation, and GST tax filings
              </p>
            </div>
            <button
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              Configure Custom Export
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Revenue & Sales Summary",
                desc: "Net revenue, gross GMV, estimated taxes, and payment mode breakdowns.",
                type: "revenue_summary",
                icon: DollarSign,
                color: "text-emerald-700 bg-emerald-50 border-emerald-200",
              },
              {
                title: "Transactions Audit Ledger",
                desc: "Complete transaction log with Order IDs, Gateway refs, and modes.",
                type: "transactions_ledger",
                icon: Receipt,
                color: "text-blue-700 bg-blue-50 border-blue-200",
              },
              {
                title: "Discounts & Coupons",
                desc: "Marketing expense reconciliation detailing absorbed coupon write-offs.",
                type: "discounts_reconciliation",
                icon: Percent,
                color: "text-purple-700 bg-purple-50 border-purple-200",
              },
              {
                title: "GST Tax Schedule",
                desc: "Turnover schedule with CGST (2.5%), SGST (2.5%), and total GST (5%).",
                type: "gst_tax_schedule",
                icon: FileSpreadsheet,
                color: "text-orange-700 bg-orange-50 border-orange-200",
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.type}
                  className="rounded-xl border border-gray-200 p-4 bg-white hover:border-gray-300 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg border ${card.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">{card.title}</h4>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                  </div>

                  <a
                    href={`/api/superadmin/export/csv?type=${card.type}&range=${range}`}
                    download
                    className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download ({range})
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <AccountantExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        restaurants={restaurants}
      />
    </div>
  );
}
