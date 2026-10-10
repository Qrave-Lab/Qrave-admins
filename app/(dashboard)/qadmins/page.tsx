"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { QAdminUser } from "@/lib/types";

export default function QAdminsPage() {
  const [users, setUsers] = useState<QAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", name: "", role: "admin" });
  const [error, setError] = useState("");
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ username: "", name: "" });

  const load = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/superadmin/qadmins");
      const data = await res.json();
      if (res.ok) setUsers(data);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this admin?")) return;
    try {
      await fetch(`/api/superadmin/qadmins?id=${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
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
    } catch (e) {
      alert("Update failed");
    }
  };

  return (
    <>
      <TopBar
        title="QAdmin Access"
        subtitle="Manage the operator accounts that can access the platform control plane."
      />

      <section className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Create QAdmin</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <input
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Username"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            />
            <input
              type="password"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
                    setForm({ username: "", password: "", name: "", role: "admin" });
                    await load();
                  } else {
                    const data = await res.json();
                    setError(data.error || "Failed to create qadmin");
                  }
                } catch {
                  setError("Failed to create qadmin. Username may already exist.");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Creating..." : "Create QAdmin"}
            </button>
          </div>
          {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Current QAdmins</h3>
            <p className="text-sm text-slate-500">{users.length} total</p>
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-6 py-3 border-b border-slate-100">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-48 bg-slate-100 rounded" />
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Username</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="px-3 py-3">
                        {editingId === user.id ? (
                          <input 
                            className="border p-1 rounded w-full"
                            value={editForm.name} 
                            onChange={e => setEditForm(v => ({ ...v, name: e.target.value }))}
                          />
                        ) : (
                          <span className="font-medium text-slate-900">{user.name || "-"}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {editingId === user.id ? (
                          <input 
                            className="border p-1 rounded w-full"
                            value={editForm.username} 
                            onChange={e => setEditForm(v => ({ ...v, username: e.target.value }))}
                          />
                        ) : (
                          user.username
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                          {user.role || "admin"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-500">
                        {user.createdAt === "Bootstrap credential"
                          ? user.createdAt
                          : new Date(user.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-3 text-right space-x-2">
                        {user.createdAt !== "Bootstrap credential" && (
                          <>
                            {editingId === user.id ? (
                              <>
                                <button onClick={() => handleEditSubmit(user.id)} className="text-green-600 hover:underline">Save</button>
                                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:underline">Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingId(user.id); setEditForm({ name: user.name || "", username: user.username }); }} className="text-blue-600 hover:underline">Edit</button>
                                <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:underline">Delete</button>
                              </>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </>
  );
}
