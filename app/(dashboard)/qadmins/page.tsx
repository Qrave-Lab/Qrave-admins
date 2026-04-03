"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { createQAdmin, fetchQAdmins } from "@/lib/api";
import { QAdminUser } from "@/lib/types";

export default function QAdminsPage() {
  const [users, setUsers] = useState<QAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const load = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      setUsers(await fetchQAdmins());
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  return (
    <>
      <TopBar
        title="QAdmin Access"
        subtitle="Manage the operator accounts that can access the platform control plane."
      />

      <section className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Create QAdmin</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                  await createQAdmin(form);
                  setForm({ username: "", password: "" });
                  await load();
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
            <div className="py-8 text-sm text-slate-500">Loading qadmins...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Username</th>
                    <th className="px-2 py-2">Created</th>
                    <th className="px-2 py-2">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-medium text-slate-900">{user.username}</td>
                      <td className="px-2 py-2 text-slate-600">
                        {user.createdAt === "Bootstrap credential"
                          ? user.createdAt
                          : new Date(user.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="px-2 py-2 text-slate-700">Full platform access</td>
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
