"use client";

import { useState } from "react";
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

  // Form State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPhone, setNewStaffPhone] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>("manager");

  const selectedRestaurantName =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurant)?.name || "";
  const managerCount = staffList.filter((staff) => staff.role === "manager").length;
  const kitchenCount = staffList.filter((staff) => staff.role === "kitchen").length;

  const fetchStaff = async (restaurantId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?restaurantId=${restaurantId}`);
      if (res.ok) {
        setStaffList(await res.json());
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
    if (id) fetchStaff(id);
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
    setNewStaffName(staff.name);
    setNewStaffEmail(staff.email);
    setNewStaffPhone(staff.phone);
    const allowedRole = STAFF_ROLES.some((role) => role.value === staff.role)
      ? (staff.role as StaffRole)
      : "manager";
    setNewStaffRole(allowedRole);
  };


  const handleSubmit = async () => {
    if (!selectedRestaurant) return;
    if (!newStaffEmail.trim()) {
      alert("Email is required");
      return;
    }
    if (!newStaffName.trim()) {
      alert("Name is required");
      return;
    }
    try {
      let result;
      if (editingStaffId) {
          result = await updateStaff(selectedRestaurant, editingStaffId, {
            name: newStaffName,
            email: newStaffEmail.trim().toLowerCase(),
            phone: newStaffPhone.trim(),
            role: newStaffRole,
          });
      } else {
          result = await addStaff(selectedRestaurant, {
            name: newStaffName,
            email: newStaffEmail.trim().toLowerCase(),
            phone: newStaffPhone.trim(),
            role: newStaffRole,
          });
      }

      if (!result?.success) {
        throw new Error(result?.error || "Failed to save staff member");
      }

      await fetchStaff(selectedRestaurant);
      resetForm();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Failed to save staff member");
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 xl:px-8">
      <div className="mb-6 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_1fr] xl:items-center">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Select Restaurant
            </label>
            <select
              className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
              value={selectedRestaurant}
              onChange={handleRestaurantChange}
              style={{
                backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="%2364748b" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4"/></svg>')`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                backgroundSize: "1rem",
              }}
            >
              <option value="">-- Choose a Restaurant --</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Team Size</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-900">{staffList.length}</p>
              <p className="text-sm text-slate-500">assigned staff</p>
            </div>
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600">Managers</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-indigo-900">{managerCount}</p>
              <p className="text-sm text-indigo-700">lead operators</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-600">Kitchen</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-amber-900">{kitchenCount}</p>
              <p className="text-sm text-amber-700">backline crew</p>
            </div>
          </div>
        </div>
      </div>

      {!selectedRestaurant ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="mb-1 text-sm font-semibold text-slate-900">No restaurant selected</p>
          <p className="text-sm text-slate-400">Choose a restaurant above to manage its staff roster</p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_400px] xl:items-start">
          <div className="min-w-0">
            <div className="mb-5 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Team Board</p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                    {selectedRestaurantName || "Restaurant"} staff
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Review role assignments, operator access, and restaurant coverage in one place.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  {STAFF_ROLES.map((role) => {
                    const count = staffList.filter((staff) => staff.role === role.value).length;
                    if (count === 0) return null;
                    return (
                      <span key={role.value} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                        {role.label}: {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-5 w-32 rounded bg-slate-200" />
                      <div className="h-6 w-20 rounded-full bg-slate-100" />
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 w-full rounded bg-slate-100" />
                      <div className="h-4 w-2/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : staffList.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-900">No staff members yet</p>
                <p className="text-sm text-slate-400">Add the first team member using the panel on the right</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {staffList.map((staff) => (
                  <div
                    key={staff.id}
                    className="group flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/70"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black tracking-tight text-slate-900">{staff.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{staff.email}</p>
                      </div>
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">
                        {STAFF_ROLES.find((role) => role.value === staff.role)?.label || staff.role}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-3">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Phone</p>
                        <p className="mt-1 text-sm font-semibold text-slate-700">{staff.phone || "Not added yet"}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Role Key</p>
                        <p className="mt-1 text-sm font-semibold capitalize text-slate-700">{staff.role.replaceAll("_", " ")}</p>
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-semibold text-slate-500">Restaurant operator access</span>
                      <button
                        onClick={() => handleEdit(staff)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        Edit Staff
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="xl:min-w-0">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm xl:sticky xl:top-28">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Operator Studio</p>
                  <h3 className="mt-1 text-lg font-black text-slate-900">
                    {editingStaffId ? "Edit Staff Member" : "Add New Staff Member"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingStaffId ? "Update the assigned operator details and role" : "Create a new staff account for this restaurant"}
                  </p>
                </div>
                {editingStaffId && (
                  <button
                    onClick={resetForm}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    ✕ Cancel
                  </button>
                )}
              </div>

              <div className="space-y-5 px-6 py-5">
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="e.g. Arun Nair"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
                  <input
                    type="email"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="operator@restaurant.com"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="+91 9XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900"
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                  >
                    {STAFF_ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className={`w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all active:scale-[0.98] ${
                    editingStaffId ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-900 hover:bg-black"
                  }`}
                >
                  {editingStaffId ? "Update Staff Member" : "Add Staff Member"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
