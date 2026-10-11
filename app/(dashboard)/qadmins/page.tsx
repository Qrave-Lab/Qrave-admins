"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { QAdminUser } from "@/lib/types";
import { ROLE_DEFINITIONS, QAdminRole, normalizeQAdminRole } from "@/lib/auth/roles";
import {
  ShieldCheck,
  Shield,
  KeyRound,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  Users,
  Lock,
} from "lucide-react";

export default function QAdminsPage() {
  const [users, setUsers] = useState<QAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    role: "ops_manager" as QAdminRole,
  });
  const [error, setError] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(true);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ username: string; name: string; role: QAdminRole }>({
    username: "",
    name: "",
    role: "ops_manager",
  });

  const load = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/superadmin/qadmins");
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers(data.users || []);
          if (data.isSuperadmin !== undefined) setIsSuperadmin(data.isSuperadmin);
        }
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this operator account?")) return;
    try {
      const res = await fetch(`/api/superadmin/qadmins?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        await load();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch {
      alert("Failed to delete user");
    }
  };

  const handleEditSubmit = async (id: string) => {
    try {
      const res = await fetch("/api/superadmin/qadmins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editForm }),
      });
      if (res.ok) {
        setEditingId(null);
        await load();
      } else {
        const data = await res.json();
        alert(data.error || "Update failed");
      }
    } catch {
      alert("Update failed");
    }
  };

  const roleOptions: Array<{ id: QAdminRole; label: string; desc: string }> = [
    {
      id: "superadmin",
      label: "Super Admin (Full Root Access)",
      desc: "Complete unrestricted platform access, operator management, and deletions.",
    },
    {
      id: "ops_manager",
      label: "Operations & Support Lead",
      desc: "Store status management, downtime incidents, and staff support tickets.",
    },
    {
      id: "finance_lead",
      label: "Finance & Accountant",
      desc: "Revenue reporting, financial audit ledger, and CSV exports for accountant tax filing.",
    },
    {
      id: "menu_specialist",
      label: "Menu & Catalog Specialist",
      desc: "Food categories, dishes, modifiers, pricing, and allergen management.",
    },
    {
      id: "auditor",
      label: "Compliance Auditor (Read-Only)",
      desc: "Read-only access across audit logs, restaurant list, and support history.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      <TopBar
        title="QAdmin Access & Role-Based Permissions"
        subtitle="Manage platform operator accounts, assign granular security roles, and enforce least-privilege policies."
      />

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {/* Create QAdmin Card */}
        {isSuperadmin && (
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-slate-900" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                Provision Operator Account
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="e.g. ramesh.ops"
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Role</label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as QAdminRole }))}
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                {roleOptions.find((r) => r.id === form.role)?.desc}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 hover:bg-slate-800 transition-colors shadow-sm"
                disabled={saving}
                onClick={async () => {
                  setError("");
                  if (!form.username.trim() || !form.password.trim()) {
                    setError("Username and password are required.");
                    return;
                  }
                  setSaving(true);
                  try {
                    const res = await fetch("/api/superadmin/qadmins", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    });
                    if (res.ok) {
                      setForm({
                        username: "",
                        password: "",
                        name: "",
                        role: "ops_manager",
                      });
                      await load();
                    } else {
                      const data = await res.json();
                      setError(data.error || "Failed to create operator");
                    }
                  } catch {
                    setError("Failed to create operator. Username may already exist.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Provisioning..." : "Provision Operator"}
              </button>
            </div>
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}
          </article>
        )}

        {/* Current QAdmins Table */}
        <article className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">
                Active Platform Operators ({users.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Accounts authorized to access the Superadmin console
              </p>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Username</th>
                    <th className="px-5 py-3.5">Assigned Role</th>
                    <th className="px-5 py-3.5">Permissions Overview</th>
                    <th className="px-5 py-3.5">Created</th>
                    {isSuperadmin && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((user) => {
                    const normRole = normalizeQAdminRole(user.role);
                    const roleDef = ROLE_DEFINITIONS[normRole];
                    const isBootstrap = user.createdAt === "Bootstrap credential";

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          {editingId === user.id ? (
                            <input
                              className="border border-slate-300 rounded px-2 py-1 text-xs w-full bg-white"
                              value={editForm.name}
                              onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))}
                            />
                          ) : (
                            user.name || <span className="text-slate-400 italic">No name</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 font-mono text-slate-700">
                          {editingId === user.id ? (
                            <input
                              className="border border-slate-300 rounded px-2 py-1 text-xs w-full bg-white"
                              value={editForm.username}
                              onChange={(e) => setEditForm((v) => ({ ...v, username: e.target.value }))}
                            />
                          ) : (
                            `@${user.username}`
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {editingId === user.id ? (
                            <select
                              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white font-medium"
                              value={editForm.role}
                              onChange={(e) =>
                                setEditForm((v) => ({ ...v, role: e.target.value as QAdminRole }))
                              }
                            >
                              {roleOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${roleDef.badgeClass}`}
                            >
                              {roleDef.name}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate" title={roleDef.description}>
                          {roleDef.description}
                        </td>

                        <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                          {isBootstrap ? "Bootstrap credential" : new Date(user.createdAt).toLocaleDateString()}
                        </td>

                        {isSuperadmin && (
                          <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                            {!isBootstrap && (
                              <>
                                {editingId === user.id ? (
                                  <>
                                    <button
                                      onClick={() => handleEditSubmit(user.id)}
                                      className="font-semibold text-emerald-600 hover:text-emerald-800 mr-2"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingId(user.id);
                                        setEditForm({
                                          name: user.name || "",
                                          username: user.username,
                                          role: normRole,
                                        });
                                      }}
                                      className="font-medium text-slate-600 hover:text-slate-900 mr-2"
                                    >
                                      Edit
                                    </button>
                                    {user.username !== "anandu" && (
                                      <button
                                        onClick={() => handleDelete(user.id)}
                                        className="font-medium text-rose-600 hover:text-rose-800"
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>

        {/* Permissions Capability Matrix Table */}
        <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900">
              Role Permissions & Access Control Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly enforced server-side access controls preventing unauthorized mutations or data exfiltration
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-slate-600">
                    Platform Capability
                  </th>
                  <th className="px-4 py-3 text-center font-bold uppercase tracking-wider text-slate-900">
                    Super Admin
                  </th>
                  <th className="px-4 py-3 text-center font-bold uppercase tracking-wider text-blue-700">
                    Ops Lead
                  </th>
                  <th className="px-4 py-3 text-center font-bold uppercase tracking-wider text-emerald-700">
                    Finance Lead
                  </th>
                  <th className="px-4 py-3 text-center font-bold uppercase tracking-wider text-purple-700">
                    Menu Specialist
                  </th>
                  <th className="px-4 py-3 text-center font-bold uppercase tracking-wider text-slate-600">
                    Auditor
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { label: "Manage Operators & Roles", perm: "qadmins.manage" },
                  { label: "Permanent Store Deletion", perm: "restaurants.delete" },
                  { label: "Toggle Restaurant Status (Active/Suspend)", perm: "restaurants.status" },
                  { label: "Override Feature Flags & Plans", perm: "features.manage" },
                  { label: "Edit Menus, Dishes & Modifiers", perm: "menu.manage" },
                  { label: "Create Coupons & Global Discounts", perm: "discounts.manage" },
                  { label: "Respond to Staff Support Tickets", perm: "tickets.respond" },
                  { label: "View Revenue & Financial Reports", perm: "finance.view" },
                  { label: "Export Accountant CSV Filings", perm: "finance.export" },
                  { label: "View Tamper-Evident Audit Trail", perm: "audit.view" },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                    {(["superadmin", "ops_manager", "finance_lead", "menu_specialist", "auditor"] as QAdminRole[]).map(
                      (role) => {
                        const allowed = ROLE_DEFINITIONS[role].permissions.includes(row.perm as any);
                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            {allowed ? (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300">
                                <X className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </td>
                        );
                      }
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
