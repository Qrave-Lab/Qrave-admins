"use client";

import { useEffect, useMemo, useState } from "react";

type FeedbackLog = {
    id: string;
    type: string;
    priority: string;
    title: string;
    description: string;
    status: string;
    created_at: string;
    user_role?: string;
    restaurant_name?: string;
    user_name?: string;
    admin_response?: string;
    admin_responded_at?: string | null;
    admin_responded_by?: string;
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
    const [activeTab, setActiveTab] = useState<"feedback" | "downtime">("feedback");
    const [logs, setLogs] = useState<Array<FeedbackLog | DowntimeLog>>([]);
    const [loading, setLoading] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackLog | null>(null);
    const [newStatus, setNewStatus] = useState("open");
    const [responseNote, setResponseNote] = useState("");
    const [saving, setSaving] = useState(false);

    const feedbackLogs = useMemo(
        () => activeTab === "feedback" ? (logs as FeedbackLog[]) : [],
        [activeTab, logs],
    );

    const fetchLogs = async (type: "feedback" | "downtime") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/logs/${type}`);
            if (res.ok) {
                setLogs(await res.json());
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
        void fetchLogs(activeTab);
    }, [activeTab]);

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
        <div className="bg-white rounded shadow p-4">
            <div className="flex border-b mb-4">
                <button
                    className={`px-4 py-2 ${activeTab === "feedback" ? "border-b-2 border-blue-500 font-bold" : ""}`}
                    onClick={() => setActiveTab("feedback")}
                >
                    Staff Feedback
                </button>
                <button
                    className={`px-4 py-2 ${activeTab === "downtime" ? "border-b-2 border-blue-500 font-bold" : ""}`}
                    onClick={() => setActiveTab("downtime")}
                >
                    Downtime Events
                </button>
            </div>

            {selectedFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Manage Support Ticket</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {selectedFeedback.restaurant_name || "Unknown restaurant"}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-gray-800"
                                onClick={closeManage}
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold uppercase text-white">
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
                            </div>
                            <p className="font-semibold text-gray-900">{selectedFeedback.title}</p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{selectedFeedback.description}</p>
                            <p className="mt-3 text-xs text-gray-500">
                                Raised by {selectedFeedback.user_name || "Unknown User"} ({selectedFeedback.user_role || "Staff"})
                            </p>
                            {selectedFeedback.admin_responded_by ? (
                                <p className="mt-2 text-xs font-medium text-emerald-700">
                                    Already managed by {selectedFeedback.admin_responded_by}
                                    {selectedFeedback.admin_responded_at ? ` on ${new Date(selectedFeedback.admin_responded_at).toLocaleString()}` : ""}
                                </p>
                            ) : null}
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Status</label>
                                <select
                                    value={newStatus}
                                    onChange={(e) => setNewStatus(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                >
                                    <option value="open">Open</option>
                                    <option value="acknowledged">Acknowledged</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="wont_fix">Won&apos;t Fix</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Management Note</label>
                                <textarea
                                    rows={5}
                                    value={responseNote}
                                    onChange={(e) => setResponseNote(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                                    placeholder="What action was taken? Why was it closed? What should the team know?"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700"
                                onClick={closeManage}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                disabled={saving}
                                onClick={submitManage}
                            >
                                {saving ? "Saving..." : "Save Management"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? <p>Loading...</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {activeTab === "feedback" ? (
                                feedbackLogs.map((log, idx) => (
                                    <tr key={log.id || idx}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">
                                            {log.restaurant_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-900 text-white">
                                                            {ticketNumberFromLog(log)}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                                            log.type === "bug" ? "bg-red-100 text-red-700" :
                                                            log.type === "feature_request" ? "bg-blue-100 text-blue-700" :
                                                            log.type === "performance" ? "bg-yellow-100 text-yellow-800" :
                                                            "bg-gray-100 text-gray-700"
                                                        }`}>
                                                            {log.type?.replace("_", " ")}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                                            log.priority === "critical" ? "bg-rose-600 text-white" :
                                                            log.priority === "high" ? "bg-orange-500 text-white" :
                                                            log.priority === "medium" ? "bg-blue-100 text-blue-800" :
                                                            "bg-green-100 text-green-700"
                                                        }`}>
                                                            {log.priority}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                                            log.status === "resolved" ? "bg-emerald-100 text-emerald-700" :
                                                            log.status === "acknowledged" ? "bg-amber-100 text-amber-700" :
                                                            log.status === "wont_fix" ? "bg-slate-200 text-slate-700" :
                                                            "bg-rose-100 text-rose-700"
                                                        }`}>
                                                            {log.status}
                                                        </span>
                                                    </div>
                                                    <p className="font-bold text-gray-900">{log.title}</p>
                                                    <p className="whitespace-pre-wrap">{log.description}</p>
                                                    <p className="mt-1 text-xs text-gray-400">
                                                        By: {log.user_name || "Unknown User"} ({log.user_role || "Staff"})
                                                    </p>
                                                    {log.admin_responded_by ? (
                                                        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                                                Already Managed
                                                            </p>
                                                            <p className="mt-1 text-xs text-emerald-800">
                                                                Managed by {log.admin_responded_by}
                                                                {log.admin_responded_at ? ` on ${new Date(log.admin_responded_at).toLocaleString()}` : ""}
                                                            </p>
                                                            {log.admin_response ? (
                                                                <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">
                                                                    {log.admin_response}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-2 text-xs font-medium text-rose-600">Not managed yet</p>
                                                    )}
                                                </div>
                                                <div className="shrink-0">
                                                    <button
                                                        type="button"
                                                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                        onClick={() => openManage(log)}
                                                    >
                                                        {log.admin_responded_by ? "Update" : "Manage"}
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                (logs as DowntimeLog[]).map((log, idx) => (
                                    <tr key={log.id || idx}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : "-"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">
                                            {log.restaurant_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <p>Reason: {log.reason || "-"}</p>
                                            <p>Severity: {log.severity || "-"}</p>
                                            <p>Duration: {log.duration_minutes || log.downtime_minutes || 0} mins</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {logs.length === 0 && <tr><td colSpan={3} className="p-4 text-center">No logs found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
