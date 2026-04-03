"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RangeTabs from "@/components/RangeTabs";
import TopBar from "@/components/TopBar";
import { createRestaurant, fetchRestaurants, updateRestaurantStatus, deleteRestaurant } from "@/lib/api";
import { RestaurantStatus, RestaurantSummary, RevenueRange } from "@/lib/types";
import { Loader2, Plus, Search, Trash2, X, AlertCircle, CheckCircle2, XCircle, Store, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

export default function RestaurantsPage() {
  const [range, setRange] = useState<RevenueRange>("month");
  const [rows, setRows] = useState<RestaurantSummary[]>([]);
  const [queryText, setQueryText] = useState("");
  const [pendingID, setPendingID] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  
  // Delete Modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [form, setForm] = useState({
    brandName: "",
    locationName: "",
    ownerEmail: "",
    ownerPassword: "",
    currency: "INR",
    plan: "monthly_499",
    initialTables: 8,
  });

  useEffect(() => {
    let mounted = true;
    const load = async (showLoading: boolean) => {
      if (showLoading) setLoading(true);
      try {
        const data = await fetchRestaurants(range);
        if (mounted) setRows(data);
      } finally {
        if (mounted && showLoading) setLoading(false);
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

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.brandName, r.locationName, r.ownerEmail ?? ""].some((v) => v.toLowerCase().includes(q)));
  }, [rows, queryText]);

  const grouped = useMemo(() => {
    const map = new Map<string, RestaurantSummary[]>();
    filtered.forEach((r) => {
        if (r.ownerEmail) {
            const list = map.get(r.ownerEmail) || [];
            list.push(r);
            map.set(r.ownerEmail, list);
        }
    });

    const enriched = filtered.map(r => {
        if (!r.ownerEmail) return { ...r, branchType: 'single' };
        const list = map.get(r.ownerEmail)!;
        if (list.length <= 1) return { ...r, branchType: 'single' };
        const sorted = [...list].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        return { ...r, branchType: r.id === sorted[0].id ? 'main' : 'branch' };
    });

    return enriched.sort((a, b) => b.totalRevenueRange - a.totalRevenueRange);
  }, [filtered]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").length;
    const disabled = rows.filter((r) => r.status === "disabled" || r.status === "revoked").length;
    const mrr = rows.reduce((sum, r) => sum + r.mrr, 0);
    return { active, disabled, mrr };
  }, [rows]);

  const setStatus = async (restaurantID: string, status: RestaurantStatus) => {
    const snapshot = rows;
    setPendingID(restaurantID);
    setRows((prev) => prev.map((r) => (r.id === restaurantID ? { ...r, status } : r)));

    try {
      await updateRestaurantStatus(restaurantID, status);
    } catch {
      setRows(snapshot);
      alert("Failed to update restaurant status");
    } finally {
      setPendingID("");
    }
  };

  const handleDeleteSubimt = async () => {
      if (!deleteId) return;
      if (deleteConfirm !== "DELETE") {
          alert("Please type DELETE to confirm");
          return;
      }
      setDeleteBusy(true);
      try {
          await deleteRestaurant(deleteId);
          setRows(prev => prev.filter(r => r.id !== deleteId));
          setDeleteOpen(false);
          setDeleteId(null);
          setDeleteConfirm("");
      } catch (e) {
          alert("Failed to delete restaurant");
      } finally {
          setDeleteBusy(false);
      }
  };

  const openDelete = (id: string) => {
      setDeleteId(id);
      setDeleteConfirm("");
      setDeleteOpen(true);
  };

  const renderRestaurantContent = (r: RestaurantSummary & { branchType?: string }) => {
    const busy = pendingID === r.id;
    return (
      <div className="flex flex-col h-full bg-white rounded-xl">
        {r.branchType === 'main' && (
            <span className="inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-100/50 mb-3">
                <Store size={12} /> Main HQ
            </span>
        )}
        {r.branchType === 'branch' && (
            <span className="inline-flex w-fit items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 mb-3">
                <Layers size={12} /> Other Branch
            </span>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-bold text-slate-900 leading-tight">{r.brandName}</h3>
            <p className="text-[13px] text-slate-500 mt-0.5">{r.locationName}</p>
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${
              r.status === "active" ? "bg-emerald-50 text-emerald-700" :
                r.status === "disabled" ? "bg-amber-50 text-amber-700" :
                  r.status === "revoked" ? "bg-rose-50 text-rose-700" :
                    r.status === "trial" ? "bg-indigo-50 text-indigo-700" :
                      "bg-slate-100 text-slate-700"
            }`}
          >
            {r.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
            {r.status === "disabled" && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            {r.status === "revoked" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
            {r.status === "trial" && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
            <span className="capitalize">{r.status}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mb-5">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-0.5">Owner</p>
            <p className="truncate text-xs font-semibold text-slate-800">{r.ownerEmail || "-  "}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-0.5">Plan</p>
            <p className="text-xs font-semibold text-slate-800 capitalize">{r.plan.replace('_', ' ')}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-0.5">Member Since</p>
            <p className="text-xs font-semibold text-slate-800">{r.memberSince}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-0.5">Revenue ({range})</p>
            <p className="text-sm font-bold text-slate-900">₹{r.totalRevenueRange.toLocaleString("en-IN")}</p>
          </div>
        </div>

          <div className="pt-4 mt-auto border-t border-slate-100 flex flex-wrap items-center gap-2">
          {r.status !== "active" ? (
            <button
              className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold transition-all disabled:opacity-50"
              style={{ color: "white" }}
              disabled={busy}
              onClick={() => setStatus(r.id, "active")}
            >
              Activate
            </button>
          ) : (
            <button
              className="flex-1 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-bold transition-all disabled:opacity-50"
              style={{ color: "white" }}
              disabled={busy}
              onClick={() => setStatus(r.id, "disabled")}
            >
              Disable
            </button>
          )}
          
          <button
             className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-2 text-xs font-bold transition-all disabled:opacity-50"
            style={{ color: "white" }}
            disabled={busy || r.status === "revoked"}
            onClick={() => setStatus(r.id, "revoked")}
          >
            Revoke
          </button>

          <div className="flex gap-2 ml-auto">
            <button
              className="rounded-lg bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 p-2 transition-all disabled:opacity-50 flex items-center justify-center"
              onClick={() => openDelete(r.id)}
              title="Delete Restaurant"
            >
              <Trash2 size={16} />
            </button>
            <Link href={`/restaurants/${r.id}`} className="rounded-lg bg-slate-900 hover:bg-black px-4 py-2 text-xs font-bold transition-all flex items-center justify-center shadow-lg" style={{ color: 'white' }}>
              <span style={{ color: "white" }}>View</span>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <TopBar
        title="Restaurants"
        subtitle="Manage branch access control and subscription health."
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      <section className="px-6 py-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pr-4 text-sm font-medium outline-none transition-all focus:border-slate-400 focus:ring-2 focus:ring-slate-100 shadow-sm placeholder:text-slate-400"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search brand, location, or owner..."
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} />
            Create Restaurant
          </button>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-3"
        >
          <motion.div variants={itemVariants} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Restaurants</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">{rows.length}</p>
          </motion.div>
          <motion.div variants={itemVariants} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Active Licenses</p>
            <p className="mt-1.5 text-2xl font-bold text-emerald-600">{totals.active}</p>
          </motion.div>
          <motion.div variants={itemVariants} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total MRR</p>
            <p className="mt-1.5 text-2xl font-bold text-slate-900">₹{totals.mrr.toLocaleString("en-IN")}</p>
          </motion.div>
        </motion.div>

        {loading && rows.length === 0 ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-start">
             {[1,2,3,4,5,6].map(i => (
                <div key={i} className="animate-pulse rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="h-4 w-28 bg-slate-200 rounded mb-2"></div>
                      <div className="h-3 w-20 bg-slate-100 rounded"></div>
                    </div>
                    <div className="h-5 w-16 bg-slate-100 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="h-3 w-16 bg-slate-100 rounded"></div>
                    <div className="h-3 w-12 bg-slate-100 rounded"></div>
                    <div className="h-3 w-20 bg-slate-100 rounded"></div>
                    <div className="h-3 w-24 bg-slate-100 rounded"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 flex-1 bg-slate-100 rounded-lg"></div>
                    <div className="h-8 flex-1 bg-slate-100 rounded-lg"></div>
                    <div className="h-8 w-10 bg-slate-100 rounded-lg"></div>
                  </div>
                </div>
             ))}
          </div>
        ) : grouped.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center"
          >
            <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Search size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">No restaurants</h3>
            <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria.</p>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 items-start"
          >
            <AnimatePresence>
              {grouped.map((item: any) => (
                <motion.div layout variants={itemVariants} key={item.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                   {renderRestaurantContent(item)}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      {/* Modals */}
      <AnimatePresence>
        {createOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl rounded-2xl border border-brand-100 bg-white p-7 shadow-2xl my-8"
            >
              <div className="mb-6 flex items-center justify-between border-b border-brand-100 pb-4">
                <h3 className="text-xl font-bold tracking-tight text-brand-900">Create New Restaurant</h3>
                <button
                  type="button"
                  className="rounded-xl p-2 text-brand-400 hover:bg-brand-50 hover:text-brand-900 transition-colors"
                  onClick={() => {
                    if (!createBusy) setCreateOpen(false);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-500 px-1">Brand Name</label>
                  <input
                    className="rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-colors outline-none"
                    placeholder="e.g. Anteiku Coffee"
                    value={form.brandName}
                    onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-500 px-1">Location Details</label>
                  <input
                    className="rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-colors outline-none"
                    placeholder="e.g. 20th Ward, Tokyo"
                    value={form.locationName}
                    onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-500 px-1">Owner Email</label>
                  <input
                    className="rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-colors outline-none"
                    placeholder="admin@example.com"
                    type="email"
                    value={form.ownerEmail}
                    onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-500 px-1">Initial Password</label>
                  <input
                    className="rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-colors outline-none"
                    placeholder="••••••••"
                    type="password"
                    value={form.ownerPassword}
                    onChange={(e) => setForm((f) => ({ ...f, ownerPassword: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-1.5 border-t border-brand-100 pt-3 md:col-span-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-brand-500 px-1">Subscription Plan</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select
                      className="rounded-xl border border-brand-200 px-4 py-2.5 text-sm font-medium focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-colors outline-none"
                      value={form.plan}
                      onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                    >
                      <option value="monthly_499">Starter Monthly (₹499)</option>
                      <option value="monthly_999">Growth Monthly (₹999)</option>
                      <option value="monthly_1499">Pro Monthly (₹1499)</option>
                      <option value="yearly_5500">Starter Yearly (₹5500)</option>
                      <option value="yearly_10999">Growth Yearly (₹10999)</option>
                      <option value="yearly_14999">Pro Yearly (₹14999)</option>
                    </select>
                    <div className="flex items-center gap-3">
                       <label className="text-xs font-semibold text-brand-500 whitespace-nowrap">Initial Tables:</label>
                       <input
                        className="w-full rounded-xl border border-brand-200 px-4 py-2 text-sm font-bold focus:border-brand-900 focus:ring-1 focus:ring-brand-900 transition-colors outline-none"
                        placeholder="8"
                        type="number"
                        min={1}
                        max={200}
                        value={form.initialTables}
                        onChange={(e) => setForm((f) => ({ ...f, initialTables: Number(e.target.value || 8) }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {createError ? (
                <div className="mt-5 p-3 rounded-xl bg-rose-50 border border-rose-100 text-center">
                  <p className="text-xs font-bold text-rose-600">{createError}</p>
                </div>
              ) : null}

              <div className="mt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-brand-100">
                <button
                  type="button"
                  className="rounded-xl border border-brand-200 bg-white px-5 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-50 hover:text-brand-900 transition-colors"
                  onClick={() => setCreateOpen(false)}
                  disabled={createBusy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-900 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={createBusy}
                  onClick={async () => {
                    setCreateError("");
                    if (!form.brandName.trim() || !form.ownerEmail.trim() || !form.ownerPassword.trim()) {
                      setCreateError("Brand name, owner email and owner password are required.");
                      return;
                    }
                    setCreateBusy(true);
                    try {
                      await createRestaurant(form);
                      const data = await fetchRestaurants(range);
                      setRows(data);
                      setCreateOpen(false);
                      setForm({
                        brandName: "",
                        locationName: "",
                        ownerEmail: "",
                        ownerPassword: "",
                        currency: "INR",
                        plan: "monthly_499",
                        initialTables: 8,
                      });
                    } catch {
                      setCreateError("Failed to create restaurant. Check email uniqueness and try again.");
                    } finally {
                      setCreateBusy(false);
                    }
                  }}
                >
                  {createBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={16} />}
                  {createBusy ? "Provisioning..." : "Create Restaurant"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        
        {deleteOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.95, opacity: 0 }}
               className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-7 shadow-2xl"
            >
               <div className="mb-5 flex items-center justify-between border-b border-brand-100 pb-3">
                <h3 className="text-lg font-black tracking-tight text-rose-600 flex items-center gap-2">
                  <AlertCircle size={20} /> Destroy Data
                </h3>
                <button onClick={() => setDeleteOpen(false)} className="rounded-lg p-1 text-brand-400 hover:bg-brand-50 hover:text-brand-900 transition-colors"><X size={18} /></button>
              </div>
              <p className="mb-5 text-sm font-medium text-brand-600 leading-relaxed bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                  This action is <strong>unrecoverable</strong>. All users, menu categories, items, and orders for this branch will be wiped permanently from the database.
              </p>
              <div className="mb-6">
                <label className="text-[11px] font-bold uppercase tracking-wider text-brand-500 px-1 mb-1 block">Type DELETE to confirm</label>
                <input 
                    className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-bold text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none placeholder:font-normal placeholder:text-rose-300"
                    placeholder="DELETE"
                    value={deleteConfirm}
                    onChange={e => setDeleteConfirm(e.target.value)}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <button onClick={() => setDeleteOpen(false)} className="rounded-xl border border-brand-200 px-4 py-2 text-sm font-bold text-brand-600 hover:bg-brand-50 transition-colors">Cancel</button>
                  <button 
                      disabled={deleteBusy || deleteConfirm !== 'DELETE'}
                      onClick={handleDeleteSubimt}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                      {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                      {deleteBusy ? 'Destroying...' : 'Permanently Delete'}
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
