"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

type Props = {
  expiresAt?: string | null;
  label?: string;
  compact?: boolean;
};

function formatRemaining(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function PackageExpiryBadge({
  expiresAt,
  label = "Package ends",
  compact = false,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const content = useMemo(() => {
    if (!expiresAt) {
      return { text: "No expiry set", tone: "neutral" as const };
    }

    const target = new Date(expiresAt);
    const diff = target.getTime() - now;

    if (Number.isNaN(target.getTime())) {
      return { text: "Invalid expiry date", tone: "neutral" as const };
    }

    if (diff <= 0) {
      return {
        text: `Expired ${formatRemaining(Math.abs(diff))} ago`,
        tone: "danger" as const,
      };
    }

    return {
      text: `Ends in ${formatRemaining(diff)}`,
      tone: diff < 1000 * 60 * 60 * 24 ? ("warn" as const) : ("ok" as const),
    };
  }, [expiresAt, now]);

  const toneClass =
    content.tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : content.tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : content.tone === "ok"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      title={expiresAt ? new Date(expiresAt).toLocaleString("en-IN") : label}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${compact ? "max-w-full" : ""} ${toneClass}`}
    >
      <Clock3 size={12} />
      <span className="truncate">
        {compact ? content.text : `${label}: ${content.text}`}
      </span>
    </span>
  );
}
