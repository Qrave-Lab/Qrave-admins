"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RangeTabs from "@/components/RangeTabs";
import PackageExpiryBadge from "@/components/PackageExpiryBadge";
import TopBar from "@/components/TopBar";
import {
  createRestaurant,
  fetchRestaurants,
  updateRestaurantStatus,
  deleteRestaurant,
} from "@/lib/api";
import {
  RestaurantStatus,
  RestaurantSummary,
  RevenuePoint,
  RevenueRange,
} from "@/lib/types";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";

export default function RestaurantsPage() {
  const [range, setRange] = useState<RevenueRange>("month");
  const [rows, setRows] = useState<RestaurantSummary[]>([]);
  const [queryText, setQueryText] = useState(""); // Renamed to avoid conflict if any, though query works
  const [pendingID, setPendingID] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete Modal State
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
    return rows.filter((r) =>
      [r.brandName, r.locationName, r.ownerEmail ?? ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [rows, queryText]);

  const grouped = useMemo(() => {
    const map = new Map<string, RestaurantSummary[]>();
    const result: (
      | RestaurantSummary
      | {
          type: "group";
          ownerEmail: string;
          brandName: string;
          mainBranch: RestaurantSummary;
          subBranches: RestaurantSummary[];
        }
    )[] = [];
    const singles: RestaurantSummary[] = [];

    filtered.forEach((r) => {
      if (r.ownerEmail) {
        const list = map.get(r.ownerEmail) || [];
        list.push(r);
        map.set(r.ownerEmail, list);
      } else {
        singles.push(r);
      }
    });

    for (const [email, list] of map.entries()) {
      if (list.length > 1) {
        // Sort by creation date (older first) to pick the "Main" branch
        const sorted = list.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        result.push({
          type: "group",
          ownerEmail: email,
          brandName: sorted[0].brandName,
          mainBranch: sorted[0],
          subBranches: sorted.slice(1),
        });
      } else {
        singles.push(list[0]);
      }
    }

    return [...result, ...singles].sort((a, b) => {
      // Sort groups/singles by total revenue desc
      const revA =
        "type" in a
          ? (a as any).mainBranch.totalRevenueRange +
            (a as any).subBranches.reduce(
              (acc: number, i: any) => acc + i.totalRevenueRange,
              0,
            )
          : a.totalRevenueRange;
      const revB =
        "type" in b
          ? (b as any).mainBranch.totalRevenueRange +
            (b as any).subBranches.reduce(
              (acc: number, i: any) => acc + i.totalRevenueRange,
              0,
            )
          : b.totalRevenueRange;
      return revB - revA;
    });
  }, [filtered]);

  const totals = useMemo(() => {
    const active = rows.filter((r) => r.status === "active").length;
    // ... existing logic
    const disabled = rows.filter(
      (r) => r.status === "disabled" || r.status === "revoked",
    ).length;
    const mrr = rows.reduce((sum, r) => sum + r.mrr, 0);
    return { active, disabled, mrr };
  }, [rows]);

  const setStatus = async (restaurantID: string, status: RestaurantStatus) => {
    // ... existing logic
    const snapshot = rows;
    setPendingID(restaurantID);
    setRows((prev) =>
      prev.map((r) => (r.id === restaurantID ? { ...r, status } : r)),
    );

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
      setRows((prev) => prev.filter((r) => r.id !== deleteId));
      setDeleteOpen(false);
      setDeleteId(null);
      setDeleteConfirm("");
    } catch (e) {
      alert("Failed to delete restaurant");
      console.error(e);
    } finally {
      setDeleteBusy(false);
    }
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setDeleteConfirm("");
    setDeleteOpen(true);
  };

  const renderRestaurantContent = (r: RestaurantSummary) => {
    const busy = pendingID === r.id;
    return (
      <>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-gray-900">
              {r.brandName}
            </h3>
            <p className="text-sm text-gray-500">{r.locationName}</p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
              r.status === "active"
                ? "bg-green-100 text-green-700"
                : r.status === "disabled"
                  ? "bg-amber-100 text-amber-700"
                  : r.status === "revoked"
                    ? "bg-red-100 text-red-700"
                    : r.status === "trial"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-rose-100 text-rose-700"
            }`}
          >
            {r.status}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Owner
            </dt>
            <dd className="truncate font-medium text-gray-800">
              {r.ownerEmail || "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Plan
            </dt>
            <dd className="font-medium capitalize text-gray-800">{r.plan}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Member Since
            </dt>
            <dd className="font-medium text-gray-800">{r.memberSince}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Revenue ({range})
            </dt>
            <dd className="font-semibold text-gray-900">
              ₹{r.totalRevenueRange.toLocaleString("en-IN")}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-gray-500">
              Package
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span className="font-medium text-gray-800 capitalize">
                {r.billingStatus || r.plan}
              </span>
              <PackageExpiryBadge expiresAt={r.packageExpiresAt} compact />
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            disabled={busy || r.status === "active"}
            onClick={() => setStatus(r.id, "active")}
          >
            Activate
          </button>
          <button
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            disabled={busy || r.status === "disabled"}
            onClick={() => setStatus(r.id, "disabled")}
          >
            Disable
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            disabled={busy || r.status === "revoked"}
            onClick={() => setStatus(r.id, "revoked")}
          >
            Revoke
          </button>
          <button
            className="rounded-md bg-gray-600 hover:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            onClick={() => openDelete(r.id)}
          >
            <Trash2 size={12} />
          </button>
          <Link
            href={`/restaurants/${r.id}`}
            className="ml-auto rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700"
          >
            Open
          </Link>
        </div>
      </>
    );
  };

  return (
    <>
      <TopBar
        title="Restaurants"
        subtitle="Branch access control and subscription health overview."
        rightSlot={<RangeTabs value={range} onChange={setRange} />}
      />

      <section className="px-6 py-8 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus size={16} />
            Create Restaurant
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total Restaurants
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {rows.length}
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Active
            </p>
            <p className="mt-1 text-2xl font-bold text-green-700">
              {totals.active}
            </p>
          </article>
          <article className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Total MRR
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              ₹{totals.mrr.toLocaleString("en-IN")}
            </p>
          </article>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-blue-200 transition focus:border-blue-500 focus:ring-2"
            placeholder="Search brand, location, owner email"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
          />
        </div>

        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading restaurants...
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-10 text-center text-sm text-gray-500">
            No restaurants found.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {grouped.map((item) => {
              if (
                "type" in item &&
                "mainBranch" in item &&
                "subBranches" in item
              ) {
                // Type assertion for the grouped object we just created
                const group = item as {
                  type: "group";
                  ownerEmail: string;
                  brandName: string;
                  mainBranch: RestaurantSummary;
                  subBranches: RestaurantSummary[];
                };

                return (
                  <div
                    key={`group-${group.ownerEmail}`}
                    className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4"
                  >
                    {/* Main Branch */}
                    <div className="border-b border-gray-100 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          Main Branch
                        </span>
                      </div>
                      {renderRestaurantContent(group.mainBranch)}
                    </div>

                    {group.subBranches.length > 0 && (
                      <div className="border-t border-slate-100 pt-4 mt-4 bg-slate-50/50 -mx-5 -mb-5 p-5 rounded-b-xl">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3 px-1">
                          <div className="h-px w-3 bg-gray-300"></div>
                          Other Branches ({group.subBranches.length})
                          <div className="h-px flex-1 bg-gray-200"></div>
                        </h4>
                        <div className="space-y-4">
                          {group.subBranches.map((sub) => (
                            <div
                              key={sub.id}
                              className="relative bg-white rounded-lg border border-slate-200 p-4 shadow-sm ml-4 before:content-[''] before:absolute before:-left-4 before:top-8 before:h-px before:w-4 before:bg-slate-300 before:z-0 after:content-[''] after:absolute after:-left-4 after:-top-8 after:bottom-1/2 after:w-px after:bg-slate-300 after:z-0 last:after:h-16 last:after:bottom-auto"
                            >
                              {renderRestaurantContent(sub)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }
              // Render single restaurant
              return (
                <div
                  key={(item as RestaurantSummary).id}
                  className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  {renderRestaurantContent(item as RestaurantSummary)}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-white/40 bg-white/90 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Create New Restaurant
              </h3>
              <button
                type="button"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                onClick={() => {
                  if (!createBusy) setCreateOpen(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Brand Name"
                value={form.brandName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brandName: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Location / Area"
                value={form.locationName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locationName: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Owner Email"
                type="email"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ownerEmail: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Owner Password"
                type="password"
                value={form.ownerPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ownerPassword: e.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                value={form.plan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, plan: e.target.value }))
                }
              >
                <option value="monthly_499">Starter Monthly (₹499)</option>
                <option value="monthly_999">Growth Monthly (₹999)</option>
                <option value="monthly_1499">Pro Monthly (₹1499)</option>
                <option value="yearly_5500">Starter Yearly (₹5500)</option>
                <option value="yearly_10999">Growth Yearly (₹10999)</option>
                <option value="yearly_14999">Pro Yearly (₹14999)</option>
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                placeholder="Initial Tables"
                type="number"
                min={1}
                max={200}
                value={form.initialTables}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    initialTables: Number(e.target.value || 8),
                  }))
                }
              />
            </div>

            {createError ? (
              <p className="mt-3 text-sm font-medium text-red-600">
                {createError}
              </p>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
                onClick={() => setCreateOpen(false)}
                disabled={createBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={createBusy}
                onClick={async () => {
                  setCreateError("");
                  if (
                    !form.brandName.trim() ||
                    !form.ownerEmail.trim() ||
                    !form.ownerPassword.trim()
                  ) {
                    setCreateError(
                      "Brand name, owner email and owner password are required.",
                    );
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
                    setCreateError(
                      "Failed to create restaurant. Check email uniqueness and try again.",
                    );
                  } finally {
                    setCreateBusy(false);
                  }
                }}
              >
                {createBusy ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/40 bg-white/90 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-600">
                Delete Restaurant
              </h3>
              <button onClick={() => setDeleteOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-700">
              This action is irreversible. All data (users, menu, orders) will
              be wiped.
              <br />
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              className="w-full border p-2 rounded mb-4"
              placeholder="Type DELETE"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-4 py-2 rounded border"
              >
                Cancel
              </button>
              <button
                disabled={deleteBusy || deleteConfirm !== "DELETE"}
                onClick={handleDeleteSubimt}
                className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50"
              >
                {deleteBusy ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
