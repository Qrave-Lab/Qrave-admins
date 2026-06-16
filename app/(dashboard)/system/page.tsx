"use client";

import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import {
  fetchSystemMetricsData,
  fetchSystemLogs,
  fetchIncidents,
  createIncident,
  resolveIncident,
  fetchAssets,
  purgeAsset,
} from "@/lib/api";
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Flame,
  HardDrive,
  Loader2,
  Radio,
  Server,
  Trash2,
  Wifi,
  TerminalSquare
} from "lucide-react";
import { SystemMetrics } from "@/lib/types";

type SystemTab = "telemetry" | "logs" | "incidents" | "assets";

export default function SystemControlPage() {
  const [activeTab, setActiveTab] = useState<SystemTab>("telemetry");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Incident form state
  const [incidentForm, setIncidentForm] = useState({
    title: "",
    message: "",
    severity: "warning",
  });
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [actionId, setActionId] = useState("");

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      if (activeTab === "telemetry") {
        const m = await fetchSystemMetricsData();
        setMetrics(m);
      } else if (activeTab === "logs") {
        const l = await fetchSystemLogs();
        setLogs(l.logs);
      } else if (activeTab === "incidents" && incidents.length === 0) {
        const inc = await fetchIncidents();
        setIncidents(inc);
      } else if (activeTab === "assets" && assets.length === 0) {
        const ast = await fetchAssets();
        setAssets(ast);
      }
    } catch (err) {
      console.error("Failed to fetch system data:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData(true);

    // Polling interval for live data
    const timer = setInterval(() => {
      void loadData(false);
    }, 3000);

    return () => clearInterval(timer);
  }, [activeTab]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.title.trim() || !incidentForm.message.trim()) return;
    setSubmittingIncident(true);
    try {
      const newInc = await createIncident(incidentForm);
      setIncidents((prev) => [newInc, ...prev]);
      setIncidentForm({ title: "", message: "", severity: "warning" });
      alert("Platform alert broadcasted successfully!");
    } catch {
      alert("Failed to broadcast platform alert.");
    } finally {
      setSubmittingIncident(false);
    }
  };

  const handleResolveIncident = async (id: string) => {
    const ok = window.confirm("Mark this platform incident as resolved and archive the broadcast?");
    if (!ok) return;
    setActionId(id);
    try {
      await resolveIncident(id);
      setIncidents((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isActive: false, resolvedAt: new Date().toISOString() } : i))
      );
    } catch {
      alert("Failed to resolve incident.");
    } finally {
      setActionId("");
    }
  };

  const handlePurgeAsset = async (id: string, name: string) => {
    const ok = window.confirm(`Are you sure you want to purge the 3D model asset for "${name}"? This deletes the GLB reference in the database.`);
    if (!ok) return;
    setActionId(id);
    try {
      await purgeAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      alert("3D GLB Asset reference successfully purged!");
    } catch {
      alert("Failed to purge asset.");
    } finally {
      setActionId("");
    }
  };

  const activeAlerts = incidents.filter((i) => i.isActive);
  const resolvedAlerts = incidents.filter((i) => !i.isActive);
  const totalStorageGb = (assets.reduce((sum, a) => sum + a.sizeMb, 0) / 1024).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12 w-full text-slate-900">
      <TopBar
        title={<h1 className="text-3xl font-extrabold tracking-tight text-slate-900">System Control</h1>}
        subtitle="Platform-wide technical operations, server metrics, and global logs."
      />

      <section className="px-8 py-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          {(["telemetry", "logs", "incidents", "assets"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all duration-200 capitalize ${
                activeTab === tab
                  ? "border-slate-950 text-slate-950"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab === "assets" ? "3D Storage Bucket" : tab === "incidents" ? "Incident Broadcasts" : tab === "logs" ? "Live Server Logs" : "Live Telemetry"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm gap-3">
            <Loader2 className="h-8 w-8 text-slate-700 animate-spin" />
            <p className="text-sm font-medium text-slate-500">Connecting command center...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* TABS 1: TELEMETRY */}
            {activeTab === "telemetry" && metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Goroutines */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-48">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Cpu className="h-4 w-4 text-indigo-500" />
                      Active Goroutines
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">Live Radar</span>
                  </div>
                  <div className="my-2">
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black text-slate-900 tracking-tight">{metrics.numGoroutines}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">Concurrency Optimal</p>
                </div>

                {/* RAM Gauge */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-48">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Server className="h-4 w-4 text-emerald-500" />
                      Allocated Memory
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">Go Runtime</span>
                  </div>
                  <div className="my-2">
                    <p className="text-4xl font-black text-slate-900 tracking-tight">{(metrics.allocBytes / 1024 / 1024).toFixed(1)} <span className="text-sm font-bold text-slate-400">MB</span></p>
                    <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((metrics.allocBytes / metrics.sysBytes) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">Sys: {(metrics.sysBytes / 1024 / 1024).toFixed(1)} MB</p>
                </div>

                {/* Garbage Collection */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-48">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-amber-500 animate-pulse" />
                      Garbage Collections
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">Total GC</span>
                  </div>
                  <div className="my-2">
                    <p className="text-4xl font-black text-slate-900 tracking-tight">{metrics.numGC} <span className="text-sm font-bold text-slate-400">cycles</span></p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">Heap Healthy</p>
                </div>

                {/* Active Websockets */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-48">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Wifi className="h-4 w-4 text-emerald-500" />
                      Active Channels
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">Live SSE</span>
                  </div>
                  <div className="my-2">
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{metrics.activeWebsockets}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">POS Websockets</p>
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase font-mono">Socket Pipelines Syncing</p>
                </div>
              </div>
            )}

            {/* TABS 2: LOGS */}
            {activeTab === "logs" && (
              <div className="bg-[#1e1e1e] border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col" style={{ height: "70vh" }}>
                <div className="bg-[#2d2d2d] border-b border-slate-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TerminalSquare className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-mono text-slate-200">api-live.log</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      STREAMING LIVE
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed text-slate-300 space-y-1">
                  {logs.length === 0 ? (
                    <p className="text-slate-500 italic">No logs found or api-live.log is empty.</p>
                  ) : (
                    logs.map((logLine, idx) => (
                      <div key={idx} className="break-all whitespace-pre-wrap">
                        {logLine.includes('"level":"ERROR"') || logLine.includes('level=ERROR') ? (
                          <span className="text-rose-400">{logLine}</span>
                        ) : logLine.includes('"level":"WARN"') || logLine.includes('level=WARN') ? (
                          <span className="text-amber-400">{logLine}</span>
                        ) : (
                          logLine
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TABS 3: INCIDENTS */}
            {activeTab === "incidents" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Broadcast Form */}
                <div className="lg:col-span-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-fit">
                  <h3 className="text-md font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
                    Publish Broadcast Alert
                  </h3>
                  <form onSubmit={handleCreateIncident} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Alert Header</label>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-slate-350 bg-white p-2.5 text-xs font-semibold outline-none focus:border-slate-500"
                        placeholder="e.g. razorpay-degraded or system-scheduled-update"
                        value={incidentForm.title}
                        onChange={(e) => setIncidentForm((prev) => ({ ...prev, title: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Severity</label>
                      <select
                        className="w-full rounded-lg border border-slate-350 bg-white p-2.5 text-xs font-bold outline-none cursor-pointer focus:border-slate-500"
                        value={incidentForm.severity}
                        onChange={(e) => setIncidentForm((prev) => ({ ...prev, severity: e.target.value }))}
                      >
                        <option value="info">Info (Blue Announcement)</option>
                        <option value="warning">Warning (Orange Incident)</option>
                        <option value="critical">Critical (Red Outage)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">Broadcast Message</label>
                      <textarea
                        className="w-full rounded-lg border border-slate-350 bg-white p-2.5 text-xs font-medium outline-none focus:border-slate-500"
                        rows={4}
                        placeholder="Detail the platform alert visible to cashiers and store operators..."
                        value={incidentForm.message}
                        onChange={(e) => setIncidentForm((prev) => ({ ...prev, message: e.target.value }))}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingIncident}
                      className="w-full rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 transition shadow-sm"
                    >
                      {submittingIncident ? "Publishing Alert..." : "Broadcast Incident Alert"}
                    </button>
                  </form>
                </div>

                {/* Alerts List */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Active Alerts */}
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                      <Flame className="h-4 w-4 text-rose-500" />
                      Active Incident Streams ({activeAlerts.length})
                    </h3>
                    {activeAlerts.length === 0 ? (
                      <p className="text-slate-400 text-xs py-4 font-semibold italic">All platform pipelines clear. No active outage logs.</p>
                    ) : (
                      <div className="space-y-4">
                        {activeAlerts.map((i) => (
                          <div
                            key={i.id}
                            className={`p-4 rounded-xl border flex justify-between items-start ${
                              i.severity === "critical"
                                ? "bg-rose-50 border-rose-100 text-rose-950"
                                : i.severity === "warning"
                                ? "bg-amber-50 border-amber-100 text-amber-950"
                                : "bg-blue-50 border-blue-100 text-blue-950"
                            }`}
                          >
                            <div className="space-y-1 pr-6">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                  i.severity === "critical"
                                    ? "bg-rose-600 text-white"
                                    : i.severity === "warning"
                                    ? "bg-amber-600 text-white"
                                    : "bg-blue-600 text-white"
                                }`}>
                                  {i.severity}
                                </span>
                                <h4 className="font-bold text-xs font-mono">{i.title}</h4>
                              </div>
                              <p className="text-xs font-medium leading-relaxed">{i.message}</p>
                              <p className="text-[10px] text-slate-400 font-medium">Broadcasted {new Date(i.createdAt).toLocaleString("en-IN")}</p>
                            </div>
                            <button
                              onClick={() => void handleResolveIncident(i.id)}
                              disabled={actionId === i.id}
                              className="px-3 py-1.5 rounded-lg border border-slate-350 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition shrink-0 shadow-sm"
                            >
                              Resolve
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Resolved Alerts */}
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                      Archived Alerts Logs ({resolvedAlerts.length})
                    </h3>
                    {resolvedAlerts.length === 0 ? (
                      <p className="text-slate-400 text-xs py-4 font-semibold italic">No past resolved broadcasts registered.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              <th className="py-2">Header</th>
                              <th className="py-2">Severity</th>
                              <th className="py-2">Broadcasted</th>
                              <th className="py-2">Resolved</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resolvedAlerts.slice(0, 10).map((i) => (
                              <tr key={i.id} className="border-b border-slate-100 text-slate-600">
                                <td className="py-2 font-bold font-mono">{i.title}</td>
                                <td className="py-2 capitalize font-semibold">{i.severity}</td>
                                <td className="py-2 font-mono text-[10px]">{new Date(i.createdAt).toLocaleDateString("en-IN")}</td>
                                <td className="py-2 font-mono text-[10px]">{new Date(i.resolvedAt).toLocaleDateString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TABS 4: ASSETS */}
            {activeTab === "assets" && (
              <div className="space-y-6">
                {/* Storage summary bar */}
                <div className="grid gap-4 md:grid-cols-3">
                  <article className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total GLB Assets</p>
                      <p className="mt-1 text-2xl font-black text-slate-900 tracking-tight">{assets.length} models</p>
                    </div>
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <HardDrive className="h-5 w-5" />
                    </div>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Supabase Storage Footprint</p>
                      <p className="mt-1 text-2xl font-black text-slate-900 tracking-tight">{totalStorageGb} MB</p>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                      <Database className="h-5 w-5" />
                    </div>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Average Asset Size</p>
                      <p className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
                        {assets.length === 0 ? "0" : (assets.reduce((sum, a) => sum + a.sizeMb, 0) / assets.length).toFixed(1)} MB
                      </p>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                  </article>
                </div>

                {/* Assets list table */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Active 3D GLB Menu Models Footprint
                  </h3>
                  {assets.length === 0 ? (
                    <p className="text-slate-400 text-xs py-4 font-semibold italic">No active 3D models uploaded to platform menu items.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            <th className="py-3">Menu Item</th>
                            <th className="py-3">Restaurant</th>
                            <th className="py-3">Model Asset URL</th>
                            <th className="py-3 text-right">Computed Size</th>
                            <th className="py-3 text-right">Registered At</th>
                            <th className="py-3 text-right">Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {assets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 font-semibold text-slate-800">{asset.name}</td>
                              <td className="py-3 text-slate-700 font-medium">{asset.restaurantName}</td>
                              <td className="py-3 text-slate-400 truncate max-w-[200px] font-mono text-[10px]">{asset.modelGlb}</td>
                              <td className="py-3 text-right font-black text-slate-800">{asset.sizeMb} MB</td>
                              <td className="py-3 text-right font-mono text-slate-500">
                                {new Date(asset.createdAt).toLocaleDateString("en-IN")}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => void handlePurgeAsset(asset.id, asset.name)}
                                  disabled={actionId === asset.id}
                                  className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-700 rounded-lg transition"
                                  title="Purge 3D Model reference"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
