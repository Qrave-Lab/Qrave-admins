"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { PhoneCall, Mail, User, Building, Trash2, Calendar, Search, Loader2 } from "lucide-react";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  restaurantName: string;
  createdAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadLeads = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/superadmin/leads", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      setLeads(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load leads");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadLeads(true);
  }, []);

  const handleDelete = async (id: string, name: string) => {
    const confirm = window.confirm(`Are you sure you want to remove the callback request from ${name}?`);
    if (!confirm) return;

    setDeletingId(id);
    setError("");

    try {
      const res = await fetch(`/api/superadmin/leads?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete contact request");
      await loadLeads();
    } catch (err: any) {
      setError(err.message || "Failed to delete lead");
    } finally {
      setDeletingId("");
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const query = search.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.email.toLowerCase().includes(query) ||
      lead.phone.toLowerCase().includes(query) ||
      lead.restaurantName.toLowerCase().includes(query)
    );
  });

  // Calculate metrics
  const totalLeads = leads.length;
  const todayLeads = leads.filter((lead) => {
    const date = new Date(lead.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }).length;

  return (
    <>
      <TopBar
        title="Leads & Callbacks"
        subtitle="Manage callback requests and demo leads submitted by prospective restaurant clients."
      />

      <section className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* Error alert */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            ⚠️ {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Leads</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{totalLeads}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Today's Leads</p>
            <p className="mt-2 text-3xl font-black text-emerald-600">{todayLeads}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Avg Lead Quality</p>
            <p className="mt-2 text-3xl font-black text-slate-900">High</p>
          </div>
        </div>

        {/* Search Control */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
          <Search size={18} className="text-slate-400" />
          <input
            className="w-full bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
            placeholder="Search leads by name, email, phone, or restaurant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Leads Table */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">
              Contact Records
            </h3>
            <p className="text-sm font-medium text-slate-500">
              {filteredLeads.length} of {leads.length} displayed
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
              <p className="text-sm font-medium text-slate-500">Loading callback requests...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-semibold text-slate-500">No leads found matching your search.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-2 py-3 font-semibold">Submitted At</th>
                    <th className="px-2 py-3 font-semibold">Contact Info</th>
                    <th className="px-2 py-3 font-semibold">Restaurant</th>
                    <th className="px-2 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="font-medium text-xs">
                            {new Date(lead.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-4 space-y-1">
                        <div className="flex items-center gap-2 font-semibold text-slate-900">
                          <User size={14} className="text-slate-400" />
                          {lead.name}
                        </div>
                        <div className="flex flex-col gap-1 text-slate-500 pl-5 text-xs">
                          <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                          >
                            <Mail size={12} />
                            {lead.email}
                          </a>
                          <a
                            href={`tel:${lead.phone}`}
                            className="flex items-center gap-1.5 hover:text-slate-900 transition-colors font-medium"
                          >
                            <PhoneCall size={12} />
                            {lead.phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2 text-slate-700 font-semibold">
                          <Building size={14} className="text-slate-400" />
                          {lead.restaurantName}
                        </div>
                      </td>
                      <td className="px-2 py-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                          disabled={deletingId === lead.id}
                          onClick={() => handleDelete(lead.id, lead.name)}
                        >
                          {deletingId === lead.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 size={13} />
                              Delete
                            </>
                          )}
                        </button>
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
