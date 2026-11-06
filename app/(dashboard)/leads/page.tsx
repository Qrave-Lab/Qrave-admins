"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import TopBar from "@/components/TopBar";
import { notify } from "@/lib/ui/feedback";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  restaurantName: string;
  city: string;
  source: string;
  createdAt: string;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/superadmin/contact-requests", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Failed to load requests");
        return res.json();
      })
      .then((data) => setLeads(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.restaurantName, l.city].some((v) => v.toLowerCase().includes(t)),
    );
  }, [leads, q]);

  const exportCsv = () => {
    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Received", "Name", "Restaurant", "City", "Phone", "Email", "Source"];
    const lines = filtered.map((l) =>
      [new Date(l.createdAt).toISOString(), l.name, l.restaurantName, l.city, l.phone, l.email, l.source].map(esc).join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify.success(`Exported ${filtered.length} request${filtered.length === 1 ? "" : "s"}.`);
  };

  return (
    <>
      <TopBar title="Contact requests" subtitle="Details submitted through the website contact form." />
      <div className="mx-auto max-w-[1500px] space-y-4 px-4 py-6 sm:px-6 xl:px-8">
        <div className="flex items-center justify-between gap-4">
          <input
            aria-label="Search contact requests"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone, restaurant…"
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
          />
          <div className="flex items-center gap-4">
            <span className="whitespace-nowrap text-sm tabular-nums text-slate-500">{filtered.length} request{filtered.length === 1 ? "" : "s"}</span>
            <button
              type="button"
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={14} aria-hidden /> Export CSV
            </button>
          </div>
        </div>

        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                {["Received", "Name", "Restaurant", "City", "Phone", "Email", "Source"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">{q ? "No requests match your search." : "No requests yet. Website contact form submissions appear here."}</td></tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{new Date(l.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{l.name}</td>
                    <td className="px-4 py-3">{l.restaurantName}</td>
                    <td className="px-4 py-3">{l.city || "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><a href={`tel:${l.phone}`} className="hover:underline">{l.phone}</a></td>
                    <td className="px-4 py-3"><a href={`mailto:${l.email}`} className="hover:underline">{l.email}</a></td>
                    <td className="px-4 py-3 text-slate-500">{l.source || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
