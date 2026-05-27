"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import { fetchAuditLogs } from "@/lib/api";
import { AuditLogRecord } from "@/lib/types";
import { Loader2, Search, Filter, ShieldAlert, Eye, X } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const loadLogs = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchAuditLogs(search, actionFilter);
      setLogs(data);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      void loadLogs(true);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, actionFilter]);

  const uniqueActions = [
    "UPDATE_RESTAURANT_STATUS",
    "DELETE_RESTAURANT",
    "CREATE_RESTAURANT",
    "CREATE_QADMIN",
    "DELETE_QADMIN",
    "RESPOND_TO_TICKET",
    "UPDATE_SUBSCRIPTION_PLAN",
    "GRANT_TRIAL_EXTENSION"
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full text-slate-900">
      <TopBar
        title={<h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Audit Logs</h1>}
        subtitle="Cryptographically verified administrative control actions and security trail history."
      />

      <section className="px-8 py-8 max-w-7xl mx-auto space-y-6">
        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none ring-slate-100 transition focus:border-slate-500 focus:ring-2"
              placeholder="Search by actor email or target ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full md:w-56 rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-8 text-sm outline-none cursor-pointer focus:border-slate-500"
              >
                <option value="">All Actions</option>
                {uniqueActions.map((action) => (
                  <option key={action} value={action}>
                    {action.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setSearch("");
                setActionFilter("");
              }}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl shadow-sm gap-3">
            <Loader2 className="h-8 w-8 text-slate-700 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Loading audit history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm gap-3 text-center">
            <ShieldAlert className="h-10 w-10 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-700">No logs captured</h3>
            <p className="text-sm text-slate-500 max-w-sm">No administrative actions have been registered matching your filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/50">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Actor</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Target Type</th>
                    <th className="px-6 py-4">Target ID</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-55/40 transition-colors">
                      <td className="whitespace-nowrap px-6 py-4 text-xs font-semibold text-slate-500 font-mono">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-800">
                        {log.actorEmail}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.action.startsWith("DELETE")
                            ? "bg-red-50 text-red-700 border border-red-100"
                            : log.action.startsWith("CREATE")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                        {log.targetType || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-600 font-mono truncate max-w-[120px]">
                        {log.targetId || "-"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Details Slide-Over / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/30 overflow-y-auto h-full w-full flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="relative mx-auto p-6 border w-[600px] shadow-2xl rounded-2xl bg-white/95 backdrop-blur">
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Audit Record Details</h3>
                <p className="text-xs text-slate-500 mt-1 font-mono">{selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 bg-transparent hover:bg-slate-100 hover:text-slate-900 rounded-lg text-sm p-1.5 inline-flex items-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Timestamp</dt>
                <dd className="mt-1 font-mono font-medium text-slate-800">
                  {new Date(selectedLog.createdAt).toLocaleString("en-IN")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actor</dt>
                <dd className="mt-1 font-medium text-slate-800">{selectedLog.actorEmail}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Action Type</dt>
                <dd className="mt-1 font-semibold text-slate-800">{selectedLog.action}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">Target Type & ID</dt>
                <dd className="mt-1 font-mono font-medium text-slate-800">
                  {selectedLog.targetType || "N/A"} / {selectedLog.targetId || "N/A"}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Action Metadata</h4>
              <div className="overflow-x-auto rounded-xl bg-slate-900 p-4 shadow-inner text-emerald-400 font-mono text-xs max-h-72">
                <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </div>
            </div>

            <div className="flex items-center justify-end pt-5 border-t border-slate-100 mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="bg-slate-900 py-2 px-5 rounded-lg shadow-sm text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
