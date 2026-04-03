"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RangeTabs from "@/components/RangeTabs";
import TopBar from "@/components/TopBar";
import { fetchOverview, fetchRestaurants } from "@/lib/api";
import { Overview, RestaurantSummary, RevenueRange } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Shield,
  Zap,
  Globe,
  ArrowUpRight,
  BarChart3,
  Radio,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
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
        
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 px-8">
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

        <section className="mt-12 px-8">
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

  const stats = [
    {
      label: "Qrave MRR",
      value: `₹${(overview?.mrr ?? 0).toLocaleString("en-IN")}`,
      icon: Zap,
    },
    {
      label: "Platform GMV",
      value: `₹${(overview?.totalRevenueRange ?? 0).toLocaleString("en-IN")}`,
      icon: Activity,
    },
    {
      label: "Total Restaurants",
      value: overview?.totalRestaurants ?? 0,
      icon: Globe,
    },
    {
      label: "Active Subscriptions",
      value: overview?.activeRestaurants ?? 0,
      icon: Shield,
    },
  ];

  return (
    <div className="min-h-screen pb-12">
      <TopBar
        title={
          <h1 className="text-3xl font-bold tracking-tight text-brand-900">
            Business Overview
          </h1>
        }
        subtitle={
          <div className="flex items-center gap-2 text-sm text-brand-500">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            Live • {range.charAt(0).toUpperCase() + range.slice(1)} View
          </div>
        }
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      {/* Stats */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 px-8"
      >
        {stats.map((item, i) => (
          <motion.div
            variants={itemVariants}
            key={i}
            className="rounded-xl border border-brand-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">
                {item.label}
              </p>
              <div className="p-2 bg-brand-50 rounded-lg group-hover:bg-brand-900 transition-colors duration-300">
                <item.icon className="h-4 w-4 text-brand-600 group-hover:text-white transition-colors duration-300" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold text-brand-900 tracking-tight">
              {item.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Leaderboard */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-12 px-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-brand-900" />
            </div>
            <h2 className="text-xl font-bold text-brand-900 tracking-tight">
              Restaurant Performance
            </h2>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-brand-100">
              <thead className="bg-brand-50/50">
                <tr>
                  <th
                    scope="col"
                    className="py-4 pl-6 pr-3 text-left text-[11px] font-bold uppercase tracking-wider text-brand-500"
                  >
                    Restaurant
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-brand-500"
                  >
                    Plan
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-center text-[11px] font-bold uppercase tracking-wider text-brand-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-brand-500"
                  >
                    Revenue ({range})
                  </th>
                  <th
                    scope="col"
                    className="pr-6 pl-3 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-brand-500"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100 bg-white">
                <AnimatePresence>
                  {restaurants.map((r, i) => (
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      key={r.id}
                      className="group transition-colors hover:bg-brand-50/50"
                    >
                      <td className="whitespace-nowrap py-4 pl-6 pr-3">
                        <div className="font-semibold text-brand-900">{r.brandName}</div>
                        <div className="mt-0.5 text-sm font-medium text-brand-500">{r.locationName}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 border border-slate-200 uppercase tracking-widest">
                          {r.plan.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-center">
                        <span
                          className={`
                            inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest
                            ${r.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : r.status === "trial"
                                ? "bg-indigo-50 text-indigo-700"
                                : r.status === "disabled"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"}
                          `}
                        >
                           {r.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                           {r.status === "disabled" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                           {r.status === "revoked" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                           {r.status === "trial" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                          {r.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-right font-bold text-brand-900">
                        ₹{(r.totalRevenueRange ?? 0).toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap pr-6 pl-3 py-4 text-right text-sm">
                        <Link
                          href={`/restaurants/${r.id}`}
                          className="font-semibold text-brand-600 hover:text-brand-900 transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>View Details</span>
                          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>
    </div>
  );
}