"use client";

import { useEffect, useMemo, useState } from "react";
import AuditLogViewer from "@/components/AuditLogViewer";
import type { SlaSummaryMetrics, TicketSlaDetails } from "@/lib/sla";
import { formatSlaMinutes, SLA_TARGETS, normalizePriority } from "@/lib/sla";

type FeedbackLog = {
    id: string;
    type: string;
    priority: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    resolved_at?: string | null;
    user_role?: string;
    restaurant_name?: string;
    user_name?: string;
    admin_response?: string;
    admin_responded_at?: string | null;
    admin_responded_by?: string;
    sla?: TicketSlaDetails;
};

type DowntimeLog = {
    id: string;
    created_at?: string;
    restaurant_name?: string;
    reason?: string;
    duration_minutes?: number;
    downtime_minutes?: number;
    severity?: string;
    started_at?: string;
    ended_at?: string;
};

function ticketNumberFromLog(log: { id: string; created_at?: string }): string {
    const date = log.created_at ? new Date(log.created_at) : null;
    const y = date && !Number.isNaN(date.getTime()) ? date.getFullYear() : 0;
    const m = date && !Number.isNaN(date.getTime()) ? String(date.getMonth() + 1).padStart(2, "0") : "00";
    const d = date && !Number.isNaN(date.getTime()) ? String(date.getDate()).padStart(2, "0") : "00";
    const suffix = String(log.id || "").replace(/-/g, "").slice(0, 6).toUpperCase() || "UNKNOWN";
    return `QTK-${y}${m}${d}-${suffix}`;
}

export default function LogViewer() {
    const [activeTab, setActiveTab] = useState<"audit" | "feedback" | "downtime">("audit");
    const [logs, setLogs] = useState<Array<FeedbackLog | DowntimeLog>>([]);
    const [slaMetrics, setSlaMetrics] = useState<SlaSummaryMetrics | null>(null);
    const [slaFilter, setSlaFilter] = useState<"all" | "breached" | "approaching" | "open" | "resolved">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackLog | null>(null);
    const [newStatus, setNewStatus] = useState("open");
    const [responseNote, setResponseNote] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchLogs = async (type: "feedback" | "downtime") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/logs/${type}`);
            if (res.ok) {
                const data = await res.json();
                if (type === "feedback") {
                    if (data && Array.isArray(data.tickets)) {
                        setLogs(data.tickets);
                        setSlaMetrics(data.metrics || null);
                    } else if (Array.isArray(data)) {
                        setLogs(data);
                    }
                } else {
                    setLogs(Array.isArray(data) ? data : []);
                }
            } else {
                setLogs([]);
            }
        } catch (error) {
            console.error(error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "feedback" || activeTab === "downtime") {
            void fetchLogs(activeTab);
        }
    }, [activeTab]);

    const feedbackLogs = useMemo(() => {
        if (activeTab !== "feedback") return [];
        const raw = logs as FeedbackLog[];
        return raw.filter((log) => {
            // SLA filter
            if (slaFilter === "breached") {
                const isBreached = log.sla?.responseStatus === "breached" || log.sla?.resolutionStatus === "breached";
                if (!isBreached) return false;
            } else if (slaFilter === "approaching") {
                if (log.sla?.responseStatus !== "approaching_breach") return false;
            } else if (slaFilter === "open") {
                if (log.status === "resolved" || log.status === "wont_fix") return false;
            } else if (slaFilter === "resolved") {
                if (log.status !== "resolved" && log.status !== "wont_fix") return false;
            }

            // Search query filter
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const matchRest = (log.restaurant_name || "").toLowerCase().includes(q);
                const matchTitle = (log.title || "").toLowerCase().includes(q);
                const matchUser = (log.user_name || "").toLowerCase().includes(q);
                const matchTicket = ticketNumberFromLog(log).toLowerCase().includes(q);
                if (!matchRest && !matchTitle && !matchUser && !matchTicket) return false;
            }

            return true;
        });
    }, [activeTab, logs, slaFilter, searchTerm]);

    const rawFeedbackList = useMemo(() => {
        return activeTab === "feedback" ? (logs as FeedbackLog[]) : [];
    }, [activeTab, logs]);

    const openManage = (log: FeedbackLog) => {
        setSelectedFeedback(log);
        setNewStatus(log.status || "open");
        setResponseNote(log.admin_response || "");
    };

    const closeManage = () => {
        setSelectedFeedback(null);
        setNewStatus("open");
        setResponseNote("");
    };

    const submitManage = async () => {
        if (!selectedFeedback) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/superadmin/staff-feedback/${selectedFeedback.id}/respond`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    status: newStatus,
                    response: responseNote,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to update feedback");
            }

            await fetchLogs("feedback");
            closeManage();
        } catch (error) {
            console.error(error);
            alert("Failed to manage feedback");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex border-b border-slate-200 gap-2 bg-white px-5 py-3 rounded-xl border shadow-xs">
                <button
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === "audit"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    onClick={() => setActiveTab("audit")}
                >
                    🛡️ Audit Trail
                </button>
                <button
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === "feedback"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    onClick={() => setActiveTab("feedback")}
                >
                    🎧 Support & SLA Radar
                </button>
                <button
                    className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                        activeTab === "downtime"
                            ? "bg-slate-900 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                    onClick={() => setActiveTab("downtime")}
                >
                    ⚡ Downtime Events
                </button>
            </div>

            {activeTab === "audit" && <AuditLogViewer />}

            {activeTab === "feedback" && (
                <div className="space-y-6">
                    {/* Critical SLA Warning Banner */}
                    {slaMetrics && slaMetrics.breachedCount > 0 && (
                        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-900 flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl leading-none">⚠️</span>
                                <div>
                                    <h4 className="font-bold text-sm text-rose-950">
                                        Support SLA Alert: {slaMetrics.breachedCount} {slaMetrics.breachedCount === 1 ? "Ticket Exceeds" : "Tickets Exceed"} SLA Commitments
                                    </h4>
                                    <p className="text-xs text-rose-800 mt-0.5">
                                        Response or resolution times have surpassed operational SLA thresholds. Immediate attention required to maintain client retention.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSlaFilter("breached")}
                                className="px-3 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 whitespace-nowrap transition-colors"
                            >
                                View Breached ({slaMetrics.breachedCount})
                            </button>
                        </div>
                    )}

                    {/* SLA Performance Overview Metrics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance Rate</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    (slaMetrics?.complianceRate ?? 100) >= 90
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                        : (slaMetrics?.complianceRate ?? 100) >= 75
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-rose-50 text-rose-800 border-rose-200"
                                }`}>
                                    Target: ≥95%
                                </span>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">
                                {slaMetrics ? `${slaMetrics.complianceRate}%` : "—"}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {slaMetrics ? `${slaMetrics.totalTickets - slaMetrics.breachedCount} of ${slaMetrics.totalTickets} compliant` : "Computing..."}
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Breached Tickets</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    (slaMetrics?.breachedCount ?? 0) > 0
                                        ? "bg-rose-50 text-rose-800 border-rose-200"
                                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                }`}>
                                    {(slaMetrics?.breachedCount ?? 0) > 0 ? "Urgent Action" : "Zero Breaches"}
                                </span>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">
                                {slaMetrics?.breachedCount ?? 0}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                Overdue first response or resolution
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Soon (&lt;30m)</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                    (slaMetrics?.approachingCount ?? 0) > 0
                                        ? "bg-orange-50 text-orange-800 border-orange-200"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}>
                                    {(slaMetrics?.approachingCount ?? 0) > 0 ? "Expedite" : "Nominal"}
                                </span>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">
                                {slaMetrics?.approachingCount ?? 0}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                FRT deadline approaching
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg First Response</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-blue-50 text-blue-800 border-blue-200">
                                    FRT Mean
                                </span>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">
                                {slaMetrics ? formatSlaMinutes(slaMetrics.avgResponseMinutes) : "—"}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                1h (crit) / 4h (high) standard
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Resolution</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-purple-50 text-purple-800 border-purple-200">
                                    MTTR
                                </span>
                            </div>
                            <div className="mt-2 text-2xl font-black text-slate-900">
                                {slaMetrics ? formatSlaMinutes(slaMetrics.avgResolutionMinutes) : "—"}
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                4h (crit) / 12h (high) standard
                            </p>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setSlaFilter("all")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                    slaFilter === "all"
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                All Tickets ({rawFeedbackList.length})
                            </button>
                            <button
                                onClick={() => setSlaFilter("breached")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                                    slaFilter === "breached"
                                        ? "bg-rose-600 text-white border-rose-600"
                                        : "bg-white text-rose-700 border-rose-200 hover:bg-rose-50"
                                }`}
                            >
                                <span>⚠️ Breached</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                                    {slaMetrics?.breachedCount ?? 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setSlaFilter("approaching")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                                    slaFilter === "approaching"
                                        ? "bg-orange-500 text-white border-orange-500"
                                        : "bg-white text-orange-700 border-orange-200 hover:bg-orange-50"
                                }`}
                            >
                                <span>⏱️ Approaching</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-orange-100 text-orange-800">
                                    {slaMetrics?.approachingCount ?? 0}
                                </span>
                            </button>
                            <button
                                onClick={() => setSlaFilter("open")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                    slaFilter === "open"
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                Open ({slaMetrics?.openTickets ?? 0})
                            </button>
                            <button
                                onClick={() => setSlaFilter("resolved")}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                    slaFilter === "resolved"
                                        ? "bg-emerald-700 text-white border-emerald-700"
                                        : "bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50"
                                }`}
                            >
                                Resolved ({rawFeedbackList.filter(f => f.status === "resolved" || f.status === "wont_fix").length})
                            </button>
                        </div>

                        <div className="w-full md:w-64">
                            <input
                                type="text"
                                placeholder="Search ticket, restaurant, issue..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-slate-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Feedback Tickets Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading tickets and SLA data...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">
                                                Created / Age
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-56">
                                                Restaurant & Submitter
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                Issue & SLA Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {feedbackLogs.map((log, idx) => {
                                            const normPri = normalizePriority(log.priority);
                                            const target = SLA_TARGETS[normPri];
                                            return (
                                                <tr key={log.id || idx} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 align-top">
                                                        <div className="font-semibold text-slate-900">
                                                            {new Date(log.created_at).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        {log.sla && (
                                                            <div className="mt-2 text-[10px] text-slate-500 font-mono">
                                                                Age: {formatSlaMinutes(log.sla.elapsedMinutes)}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium text-gray-900 align-top">
                                                        <div className="font-bold text-sm text-slate-900">
                                                            {log.restaurant_name || "Platform Direct"}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            By: <span className="font-semibold text-slate-700">{log.user_name || "Unknown User"}</span>
                                                        </div>
                                                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                            Role: {log.user_role || "Staff"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs text-gray-500 align-top">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="min-w-0 flex-1">
                                                                {/* Tags Bar */}
                                                                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                                                    <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 text-white">
                                                                        {ticketNumberFromLog(log)}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                        log.type === "bug" ? "bg-red-100 text-red-700 border border-red-200" :
                                                                        log.type === "feature_request" ? "bg-blue-100 text-blue-700 border border-blue-200" :
                                                                        log.type === "performance" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                                                                        "bg-gray-100 text-gray-700 border border-gray-200"
                                                                    }`}>
                                                                        {log.type?.replace("_", " ")}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                        normPri === "critical" ? "bg-rose-600 text-white" :
                                                                        normPri === "high" ? "bg-orange-500 text-white" :
                                                                        normPri === "low" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                                                        "bg-blue-100 text-blue-800 border border-blue-200"
                                                                    }`}>
                                                                        {log.priority} priority
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                                        log.status === "resolved" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                                                                        log.status === "acknowledged" ? "bg-amber-100 text-amber-800 border border-amber-200" :
                                                                        log.status === "wont_fix" ? "bg-slate-200 text-slate-700 border border-slate-300" :
                                                                        "bg-rose-100 text-rose-800 border border-rose-200"
                                                                    }`}>
                                                                        {log.status}
                                                                    </span>
                                                                    {/* SLA Badge */}
                                                                    {log.sla && (
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.sla.badgeClass}`}>
                                                                            {log.sla.badgeText}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Title & Description */}
                                                                <p className="font-bold text-sm text-gray-900">{log.title}</p>
                                                                <p className="whitespace-pre-wrap text-slate-700 mt-1 text-xs leading-relaxed">{log.description}</p>

                                                                {/* SLA Target Details */}
                                                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                                                                    <div>
                                                                        <span className="font-semibold text-slate-700">Target FRT:</span> {formatSlaMinutes(target.firstResponseMinutes)}
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-semibold text-slate-700">Target Resolution:</span> {formatSlaMinutes(target.resolutionMinutes)}
                                                                    </div>
                                                                    {log.admin_responded_at && (
                                                                        <div>
                                                                            <span className="font-semibold text-slate-700">First Responded:</span> {new Date(log.admin_responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatSlaMinutes(log.sla?.responseElapsedMinutes ?? 0)})
                                                                        </div>
                                                                    )}
                                                                    {log.resolved_at && (
                                                                        <div>
                                                                            <span className="font-semibold text-slate-700">Resolved:</span> {new Date(log.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({formatSlaMinutes(log.sla?.resolutionElapsedMinutes ?? 0)})
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Operator Response */}
                                                                {log.admin_responded_by ? (
                                                                    <div className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-2.5">
                                                                        <div className="flex items-center justify-between text-[11px]">
                                                                            <span className="font-bold uppercase tracking-wide text-emerald-800">
                                                                                Managed by {log.admin_responded_by}
                                                                            </span>
                                                                            <span className="text-emerald-700">
                                                                                {log.admin_responded_at ? new Date(log.admin_responded_at).toLocaleString() : ""}
                                                                            </span>
                                                                        </div>
                                                                        {log.admin_response ? (
                                                                            <p className="mt-1 whitespace-pre-wrap text-xs text-emerald-950 font-medium">
                                                                                {log.admin_response}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                ) : (
                                                                    <p className="mt-2 text-xs font-semibold text-rose-600">
                                                                        ⏳ Pending operator response
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div className="shrink-0 self-start">
                                                                <button
                                                                    type="button"
                                                                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-xs transition-colors"
                                                                    onClick={() => openManage(log)}
                                                                >
                                                                    {log.admin_responded_by ? "Update Response" : "Respond & Triage"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {feedbackLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="p-8 text-center text-slate-500">
                                                    No feedback tickets found matching current filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Downtime Logs Tab */}
            {activeTab === "downtime" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
                    {loading ? (
                        <p className="text-slate-500">Loading downtime logs...</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Restaurant</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {(logs as DowntimeLog[]).map((log, idx) => (
                                        <tr key={log.id || idx}>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 align-top">
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-900 align-top">
                                                {log.restaurant_name}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                <p><span className="font-semibold text-slate-700">Reason:</span> {log.reason || "-"}</p>
                                                <p><span className="font-semibold text-slate-700">Severity:</span> {log.severity || "-"}</p>
                                                <p><span className="font-semibold text-slate-700">Duration:</span> {log.duration_minutes || log.downtime_minutes || 0} mins</p>
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr><td colSpan={3} className="p-4 text-center text-slate-500">No downtime logs recorded.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Manage Ticket Modal */}
            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Manage Support Ticket</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {selectedFeedback.restaurant_name || "Platform Direct"}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                                onClick={closeManage}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Ticket Context with SLA */}
                        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-mono font-bold text-white">
                                    {ticketNumberFromLog(selectedFeedback)}
                                </span>
                                <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
                                    {selectedFeedback.type?.replace("_", " ")}
                                </span>
                                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold uppercase text-blue-700">
                                    {selectedFeedback.priority}
                                </span>
                                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold uppercase text-emerald-700">
                                    {selectedFeedback.status}
                                </span>
                                {selectedFeedback.sla && (
                                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${selectedFeedback.sla.badgeClass}`}>
                                        {selectedFeedback.sla.badgeText}
                                    </span>
                                )}
                            </div>
                            <p className="font-bold text-gray-900 text-sm">{selectedFeedback.title}</p>
                            <p className="mt-2 whitespace-pre-wrap text-xs text-gray-700 leading-relaxed">{selectedFeedback.description}</p>
                            
                            {/* SLA Target Breakdown in Modal */}
                            {(() => {
                                const normPri = normalizePriority(selectedFeedback.priority);
                                const target = SLA_TARGETS[normPri];
                                return (
                                    <div className="mt-3 pt-3 border-t border-gray-200 text-xs flex flex-wrap gap-4 text-gray-600">
                                        <div><span className="font-semibold text-gray-800">Target FRT:</span> {formatSlaMinutes(target.firstResponseMinutes)}</div>
                                        <div><span className="font-semibold text-gray-800">Target Resolution:</span> {formatSlaMinutes(target.resolutionMinutes)}</div>
                                        {selectedFeedback.sla?.timeRemainingMinutes !== null && selectedFeedback.sla?.timeRemainingMinutes !== undefined && !selectedFeedback.admin_responded_at && (
                                            <div>
                                                <span className="font-semibold text-gray-800">Time to breach:</span>{" "}
                                                <span className={selectedFeedback.sla.timeRemainingMinutes < 0 ? "text-rose-600 font-bold" : "text-amber-700 font-semibold"}>
                                                    {selectedFeedback.sla.timeRemainingMinutes < 0 ? `${formatSlaMinutes(Math.abs(selectedFeedback.sla.timeRemainingMinutes))} overdue` : `${formatSlaMinutes(selectedFeedback.sla.timeRemainingMinutes)} remaining`}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <p className="mt-3 text-[11px] text-gray-500">
                                Raised by {selectedFeedback.user_name || "Unknown User"} ({selectedFeedback.user_role || "Staff"}) on {new Date(selectedFeedback.created_at).toLocaleString()}
                            </p>
                            {selectedFeedback.admin_responded_by ? (
                                <p className="mt-2 text-xs font-semibold text-emerald-800">
                                    Last managed by {selectedFeedback.admin_responded_by}
                                    {selectedFeedback.admin_responded_at ? ` on ${new Date(selectedFeedback.admin_responded_at).toLocaleString()}` : ""}
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Ticket Lifecycle Status
                                </label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                >
                                    <option value="open">Open (Awaiting Operator)</option>
                                    <option value="acknowledged">Acknowledged (In Progress)</option>
                                    <option value="resolved">Resolved (Close Ticket & Stop SLA Timer)</option>
                                    <option value="wont_fix">Won&apos;t Fix (Closed Without Changes)</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Management & Resolution Notes
                                </label>
                                <textarea
                                    rows={4}
                                    value={responseNote}
                                    onChange={(e) => setResponseNote(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                                    placeholder="Detail actions taken, troubleshooting steps, or message sent to the client..."
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                                onClick={closeManage}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                                disabled={saving}
                                onClick={submitManage}
                            >
                                {saving ? "Saving Changes..." : "Save Ticket & Update SLA"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
