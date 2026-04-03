"use client";

import { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/TopBar";
import { fetchOperations } from "@/lib/api";
import { PlatformOperations } from "@/lib/types";

const tabs = [
  { id: "payments", label: "Payments" },
  { id: "orders", label: "Orders" },
  { id: "takeaway", label: "Takeaway" },
  { id: "tickets", label: "Tickets" },
  { id: "downtime", label: "Downtime" },
  { id: "discounts", label: "Discounts" },
] as const;

type OperationsTab = (typeof tabs)[number]["id"];

export default function OperationsPage() {
  const [data, setData] = useState<PlatformOperations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OperationsTab>("payments");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const next = await fetchOperations();
        if (mounted) setData(next);
      } finally {
        if (mounted && showLoading) setLoading(false);
      }
    };

    void load(true);
    const timer = window.setInterval(() => {
      void load(false);
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!data || !q) return data;

    return {
      ...data,
      payments: data.payments.filter((row) =>
        [row.restaurantName, row.id, row.orderId, row.mode, row.status].some((value) =>
          String(value).toLowerCase().includes(q),
        ),
      ),
      orders: data.orders.filter((row) =>
        [row.restaurantName, row.id, row.sessionId, row.status].some((value) =>
          String(value).toLowerCase().includes(q),
        ),
      ),
      takeawayOrders: data.takeawayOrders.filter((row) =>
        [row.restaurantName, row.id, row.customerName, row.orderType, row.status].some((value) =>
          String(value).toLowerCase().includes(q),
        ),
      ),
      tickets: data.tickets.filter((row) =>
        [row.restaurantName, row.title, row.type, row.priority, row.status, row.userName].some((value) =>
          String(value).toLowerCase().includes(q),
        ),
      ),
      downtime: data.downtime.filter((row) =>
        [row.restaurantName, row.reason, row.severity].some((value) =>
          String(value).toLowerCase().includes(q),
        ),
      ),
      coupons: data.coupons.filter((row) =>
        [row.restaurantName, row.name, row.couponCode].some((value) =>
          String(value).toLowerCase().includes(q),
        ),
      ),
      globalDiscounts: data.globalDiscounts.filter((row) =>
        [row.name, row.code].some((value) =>
          String(value).toLowerCase().includes(q),
        ),
      ),
    };
  }, [data, query]);

  if (loading || !filtered) {
    return (
      <>
        <TopBar title="Operations Control" subtitle="Real-time platform visibility across payments, orders, support tickets, downtime, and promotions." />
        <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 animate-pulse">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="h-3 w-28 bg-slate-200 rounded mb-3" />
                <div className="h-7 w-16 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
                <div className="h-7 w-12 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 h-64" />
        </div>
      </>
    );
  }

  const { summary } = filtered;

  return (
    <>
      <TopBar
        title="Operations Control"
        subtitle="Real-time platform visibility across payments, orders, support tickets, downtime, and promotions."
      />

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Restaurants</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.restaurantCount}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Menu Items</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.menuItemCount}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open Tickets</p>
            <p className="mt-2 text-2xl font-bold text-rose-700">{summary.openTickets}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid Payments Today</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.paidPaymentsToday}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Volume Today</p>
            <p className="mt-2 text-2xl font-bold text-emerald-700">₹{summary.paymentVolumeToday.toLocaleString("en-IN")}</p>
          </article>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Orders</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.todayOrders}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Today&apos;s Takeaway</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.todayTakeawayOrders}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Coupons</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.activeCoupons}</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Global Discounts</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{summary.activeGlobalDiscounts}</p>
          </article>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm lg:max-w-sm"
              placeholder="Search active table"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-5 overflow-x-auto">
            {activeTab === "payments" && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Restaurant</th>
                    <th className="px-2 py-2">Payment</th>
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Mode</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.payments.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-900">{row.restaurantName}</td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.id}</td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.orderId}</td>
                      <td className="px-2 py-2 text-slate-700">{row.mode || "-"}</td>
                      <td className="px-2 py-2 text-slate-700">{row.status}</td>
                      <td className="px-2 py-2 text-slate-700">₹{row.amount.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2 text-slate-600">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "orders" && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Restaurant</th>
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Session</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Items</th>
                    <th className="px-2 py-2">Subtotal</th>
                    <th className="px-2 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.orders.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-900">{row.restaurantName}</td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.id}</td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.sessionId}</td>
                      <td className="px-2 py-2 text-slate-700">{row.status}</td>
                      <td className="px-2 py-2 text-slate-700">{row.totalItems}</td>
                      <td className="px-2 py-2 text-slate-700">₹{row.subtotal.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2 text-slate-600">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "takeaway" && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Restaurant</th>
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Customer</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Payment</th>
                    <th className="px-2 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.takeawayOrders.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-900">{row.restaurantName}</td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-600">{row.id}</td>
                      <td className="px-2 py-2 text-slate-700 capitalize">{row.orderType}</td>
                      <td className="px-2 py-2 text-slate-700">{row.customerName || "-"}</td>
                      <td className="px-2 py-2 text-slate-700">{row.status}</td>
                      <td className="px-2 py-2 text-slate-700">{row.paymentMode || "-"}</td>
                      <td className="px-2 py-2 text-slate-700">₹{row.total.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "tickets" && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Restaurant</th>
                    <th className="px-2 py-2">Title</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Priority</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Reporter</th>
                    <th className="px-2 py-2">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.tickets.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 align-top">
                      <td className="px-2 py-2 font-medium text-slate-900">{row.restaurantName}</td>
                      <td className="px-2 py-2">
                        <p className="font-medium text-slate-900">{row.title}</p>
                        <p className="mt-1 max-w-md text-xs text-slate-600">{row.description}</p>
                      </td>
                      <td className="px-2 py-2 text-slate-700">{row.type}</td>
                      <td className="px-2 py-2 text-slate-700">{row.priority}</td>
                      <td className="px-2 py-2 text-slate-700">{row.status}</td>
                      <td className="px-2 py-2 text-slate-700">{row.userName} ({row.userRole || "staff"})</td>
                      <td className="px-2 py-2 text-slate-600">{row.adminResponse || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "downtime" && (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Restaurant</th>
                    <th className="px-2 py-2">Reason</th>
                    <th className="px-2 py-2">Severity</th>
                    <th className="px-2 py-2">Minutes</th>
                    <th className="px-2 py-2">Started</th>
                    <th className="px-2 py-2">Ended</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.downtime.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-900">{row.restaurantName}</td>
                      <td className="px-2 py-2 text-slate-700">{row.reason || "-"}</td>
                      <td className="px-2 py-2 text-slate-700">{row.severity}</td>
                      <td className="px-2 py-2 text-slate-700">{row.minutes}</td>
                      <td className="px-2 py-2 text-slate-600">{new Date(row.startedAt).toLocaleString("en-IN")}</td>
                      <td className="px-2 py-2 text-slate-600">{new Date(row.endedAt).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "discounts" && (
              <div className="grid gap-6 xl:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Restaurant Coupon Campaigns</h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Restaurant</th>
                          <th className="px-3 py-2">Campaign</th>
                          <th className="px-3 py-2">Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.coupons.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">{row.restaurantName}</td>
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.couponCode || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">Global Platform Discounts</h3>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Code</th>
                          <th className="px-3 py-2">Discount</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.globalDiscounts.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2 font-mono text-xs">{row.code || "-"}</td>
                            <td className="px-3 py-2">
                              {row.discountType === "percent" ? `${row.discountValue}%` : `₹${row.discountValue}`}
                            </td>
                            <td className="px-3 py-2">{row.isActive ? "Active" : "Paused"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
