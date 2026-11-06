"use client";

import { notify } from "@/lib/ui/feedback";

import { useMemo, useState } from "react";
import { Loader2, Pencil, Search, Users, X } from "lucide-react";
import { addStaff, updateStaff } from "@/lib/actions";

interface Restaurant {
  id: string;
  name: string;
}

interface Staff {
  id: string; 
  name: string; 
  email: string;
  phone: string; 
  role: string;
  restaurant_id: string;
}

type StaffRole = (typeof STAFF_ROLES)[number]["value"];

const STAFF_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "waiter", label: "Waiter" },
  { value: "kitchen", label: "Kitchen" },
  { value: "cashier", label: "Cashier" },
  { value: "delivery_rider", label: "Delivery Rider" },
] as const;

export default function StaffManager({ restaurants }: { restaurants: Restaurant[] }) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Form State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("manager");

  const selectedRestaurantName =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurant)?.name || "";

  const fetchStaff = async (restaurantId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?restaurantId=${restaurantId}`);
      if (res.ok) {
        setStaffList(await res.json());
      } else {
        notify.error("Couldn't load this restaurant's staff.");
      }
    } catch (err) {
      console.error("Error fetching staff:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedRestaurant(id);
    resetForm();
    setSearch("");
    setRoleFilter("all");
    if (id) void fetchStaff(id);
    else setStaffList([]);
  };

  const resetForm = () => {
    setNewStaffName("");
    setNewStaffEmail("");
    setNewStaffPhone("");
    setNewStaffRole("manager");
    setEditingStaffId(null);
  }

  const handleEdit = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setNewStaffName(staff.name || "");
    setNewStaffEmail(staff.email || "");
    setNewStaffPhone(staff.phone || "");
    const allowedRole = STAFF_ROLES.some((role) => role.value === staff.role)
      ? (staff.role as StaffRole)
      : "manager";
    setNewStaffRole(allowedRole);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    if (!newStaffEmail?.trim()) {
      notify.error("Enter the staff member's email.");
      return;
    }
    if (!newStaffName?.trim()) {
      notify.error("Enter the staff member's name.");
      return;
    }
    setSaving(true);
    try {
      let result;
      if (editingStaffId) {
          result = await updateStaff(selectedRestaurant, editingStaffId, {
            name: newStaffName?.trim() || "",
            email: newStaffEmail?.trim().toLowerCase() || "",
            phone: newStaffPhone?.trim() || "",
            role: newStaffRole,
          });
      } else {
          result = await addStaff(selectedRestaurant, {
            name: newStaffName?.trim() || "",
            email: newStaffEmail?.trim().toLowerCase() || "",
            phone: newStaffPhone?.trim() || "",
            role: newStaffRole,
          });
      }

      if (!result?.success) {
        throw new Error(result?.error || "Failed to save staff member");
      }

      notify.success(editingStaffId ? `${newStaffName.trim()} updated.` : `${newStaffName.trim()} added.`);
      await fetchStaff(selectedRestaurant);
      resetForm();
    } catch (e) {
      console.error(e);
      notify.error(e instanceof Error ? e.message : "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = (r: string) => STAFF_ROLES.find((x) => x.value === r)?.label || r.replaceAll("_", " ");

  const visibleStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staffList.filter(
      (st) => (roleFilter === "all" || st.role === roleFilter) && (!q || `${st.name} ${st.email} ${st.phone ?? ""}`.toLowerCase().includes(q))
    );
  }, [staffList, search, roleFilter]);

  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10";
  const label = "mb-1.5 block text-sm font-semibold text-slate-700";
  const th = "px-4 py-3 text-left text-xs font-semibold text-slate-500";

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-end">
        <div>
          <label htmlFor="staff-restaurant" className={label}>Restaurant</label>
          <select id="staff-restaurant" className={field} value={selectedRestaurant} onChange={handleRestaurantChange}>
            <option value="">Select a restaurant</option>
            {restaurants.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        {selectedRestaurant && (
          <dl className="flex flex-wrap items-end gap-x-10 gap-y-3">
            <div>
              <dt className="text-xs font-semibold text-slate-500">Staff</dt>
              <dd className="text-2xl font-bold tabular-nums text-slate-900">{staffList.length}</dd>
            </div>
            {STAFF_ROLES.map((role) => {
              const count = staffList.filter((st) => st.role === role.value).length;
              return count === 0 ? null : (
                <div key={role.value}>
                  <dt className="text-xs font-semibold text-slate-500">{role.label}s</dt>
                  <dd className="text-2xl font-bold tabular-nums text-slate-900">{count}</dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>

      {!selectedRestaurant ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
          <Users size={28} className="mb-3 text-slate-300" aria-hidden />
          <p className="font-semibold text-slate-900">No restaurant selected</p>
          <p className="mt-1 text-sm text-slate-500">Choose a restaurant to manage its staff.</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
          <div className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
                <input aria-label="Search staff" className={`${field} pl-10`} placeholder="Search name, email or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select aria-label="Filter by role" className={`${field} sm:w-48`} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="all">All roles</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500" aria-busy="true">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading staff…
              </div>
            ) : visibleStaff.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
                <p className="font-semibold text-slate-900">{staffList.length === 0 ? "No staff yet" : "No staff match these filters"}</p>
                <p className="mt-1 text-sm text-slate-500">{staffList.length === 0 ? "Add the first team member with the form." : "Try a different search or role."}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/60">
                    <tr>
                      <th scope="col" className={th}>Name</th>
                      <th scope="col" className={th}>Role</th>
                      <th scope="col" className={th}>Phone</th>
                      <th scope="col" className="w-16 px-4 py-3"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleStaff.map((st) => (
                      <tr key={st.id} className={editingStaffId === st.id ? "bg-slate-50" : "hover:bg-slate-50/60"}>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{st.name}</p>
                          <p className="text-xs text-slate-500">{st.email}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{roleLabel(st.role)}</span>
                        </td>
                        <td className="px-4 py-3.5 tabular-nums text-slate-700">{st.phone || <span className="text-slate-400">Not added</span>}</td>
                        <td className="px-4 py-3.5 text-right">
                          <button type="button" onClick={() => handleEdit(st)} aria-label={`Edit ${st.name}`} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
                            <Pencil size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} aria-label={editingStaffId ? "Edit staff member" : "Add staff member"} className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-6">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900">{editingStaffId ? "Edit staff member" : "Add staff member"}</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {editingStaffId ? "Update their details or role." : `Create an account for ${selectedRestaurantName || "this restaurant"}.`}
                </p>
              </div>
              {editingStaffId && (
                <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  <X size={14} aria-hidden /> Cancel
                </button>
              )}
            </div>
            <div className="space-y-4 px-5 py-5">
              <div>
                <label htmlFor="staff-name" className={label}>Full name</label>
                <input id="staff-name" type="text" autoComplete="off" className={field} value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} placeholder="e.g. Arun Nair" />
              </div>
              <div>
                <label htmlFor="staff-email" className={label}>Email</label>
                <input id="staff-email" type="email" autoComplete="off" className={field} value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="name@restaurant.com" />
              </div>
              <div>
                <label htmlFor="staff-phone" className={label}>Phone</label>
                <input id="staff-phone" type="tel" autoComplete="off" className={`${field} tabular-nums`} value={newStaffPhone} onChange={(e) => setNewStaffPhone(e.target.value)} placeholder="+91 9XXXXXXXXX" />
              </div>
              <div>
                <label htmlFor="staff-role" className={label}>Role</label>
                <select id="staff-role" className={field} value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}>
                  {STAFF_ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-60">
                {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
                {saving ? "Saving…" : editingStaffId ? "Save changes" : "Add staff member"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
