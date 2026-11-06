"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CreditCard } from "lucide-react";
import { Badge, Button, Card, Field, Modal, Spinner, Stat, errorText, inputClass, useToast } from "./ui";
import type { TabProps } from "./types";
import { TONE, billingState, foodCourts, formatIST, istDate, type CourtAnalytics, type CourtStatus } from "@/lib/foodCourts";

const RANGES = [
  { days: 0, label: "Today" },
  { days: 6, label: "7 days" },
  { days: 29, label: "30 days" },
];

export default function OverviewTab({ detail, reload, canManage }: TabProps) {
  const { court } = detail;
  const [days, setDays] = useState(6);
  const [data, setData] = useState<{ days: number; a: CourtAnalytics } | null>(null);
  const [error, setError] = useState("");
  const [editingBilling, setEditingBilling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    foodCourts
      .analytics(court.id, istDate(days), istDate(0))
      .then((a) => !cancelled && (setData({ days, a }), setError("")))
      .catch((e) => !cancelled && setError(errorText(e)));
    return () => {
      cancelled = true;
    };
  }, [court.id, days]);

  const a = data?.days === days ? data.a : null;
  const st = billingState(court);
  const hours = Array.from({ length: 24 }, (_, h) => {
    const key = String(h).padStart(2, "0");
    return { key, visitors: a?.byHour.find((r) => r.key === key)?.visitors ?? 0 };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Billing" className="lg:col-span-1" right={<Badge className={TONE[st.tone]}>{st.label}</Badge>}>
          <dl className="space-y-2.5 text-sm">
            <Row label="Status" value={<span className="capitalize">{court.subscriptionStatus.replace("_", " ")}</span>} />
            <Row label="Trial ends" value={formatIST(court.trialEndsAt)} />
            <Row label="Paid until" value={formatIST(court.currentPeriodEnd)} />
            <Row label="Created" value={formatIST(court.createdAt)} />
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            The court pays for all its stalls. If billing lapses (after a 72-hour grace), diners can&apos;t open menus and stalls lose admin access.
          </p>
          {canManage && (
            <Button variant="outline" className="mt-4 w-full" onClick={() => setEditingBilling(true)}>
              <CreditCard size={15} /> Change billing
            </Button>
          )}
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Diner activity</h2>
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  onClick={() => setDays(r.days)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold ${days === r.days ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">Couldn&apos;t load activity: {error}</p>
          ) : !a ? (
            <Spinner />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Stat label="Visitors" value={a.visitors.toLocaleString("en-IN")} hint="Different phones" />
              <Stat label="Menu opens" value={a.opens.toLocaleString("en-IN")} hint="Scans and visits" />
              <Stat label="3D views" value={a.stalls.reduce((n, s) => n + s.view3d, 0)} hint="Visitors who opened 3D" />
              <Stat label="Not found" value={a.noResults.reduce((n, s) => n + s.zeroResults, 0)} hint="Searches with no dish" />
            </div>
          )}
        </div>
      </div>

      {a && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {days > 0 && (
              <Card title="Visitors per day">
                <Chart data={a.byDay.map((d) => ({ key: d.key.slice(5), visitors: d.visitors }))} />
              </Card>
            )}
            <Card title="Busiest hours (IST)" className={days === 0 ? "lg:col-span-2" : ""}>
              <Chart data={hours} />
            </Card>
          </div>

          <Card title="Stalls">
            {a.stalls.length === 0 ? (
              <p className="text-sm text-slate-500">No stalls yet.</p>
            ) : (
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="py-2 font-semibold">Stall</th>
                      <th className="py-2 text-right font-semibold">Menu views</th>
                      <th className="py-2 text-right font-semibold">Dish views</th>
                      <th className="py-2 text-right font-semibold">3D views</th>
                      <th className="py-2 text-right font-semibold">AR opens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {a.stalls.map((s) => (
                      <tr key={s.restaurantId}>
                        <td className="py-2.5 font-medium text-slate-900">{s.name}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.views}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.itemViews}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.view3d}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.arOpens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">Counts are different visitors, not taps.</p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Top searches">
              <List rows={a.topSearches.map((r) => [r.query, r.searches])} empty="No searches yet." />
            </Card>
            <Card title="Searched, not found">
              <List rows={a.noResults.map((r) => [r.query, r.zeroResults])} empty="Every search found something." />
              <p className="mt-2 text-xs text-slate-500">Dishes no stall offers yet. Useful when choosing new tenants.</p>
            </Card>
            <Card title="Scans by QR code">
              <List rows={a.byZone.map((z) => [z.key, z.visitors])} empty="No scans yet." />
            </Card>
          </div>
        </>
      )}

      {editingBilling && (
        <BillingModal
          courtID={court.id}
          initial={{ status: court.subscriptionStatus, trialEndsAt: court.trialEndsAt, periodEnd: court.currentPeriodEnd }}
          onClose={() => setEditingBilling(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function List({ rows, empty }: { rows: [string, number][]; empty: string }) {
  if (rows.length === 0) return <p className="text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {rows.slice(0, 10).map(([k, v]) => (
        <li key={k} className="flex justify-between gap-3">
          <span className="truncate text-slate-700">{k}</span>
          <span className="font-semibold tabular-nums text-slate-900">{v}</span>
        </li>
      ))}
    </ul>
  );
}

function Chart({ data }: { data: { key: string; visitors: number }[] }) {
  if (data.every((d) => d.visitors === 0)) return <p className="py-12 text-center text-sm text-slate-400">No visitors in this period.</p>;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="key" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} formatter={(v) => [v, "Visitors"]} />
          <Bar dataKey="visitors" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const STATUSES: { id: CourtStatus; label: string; help: string }[] = [
  { id: "trialing", label: "Trial", help: "Live until the trial end date, then 72 hours of grace." },
  { id: "active", label: "Active (paid)", help: "Live until the paid-until date, then 72 hours of grace." },
  { id: "past_due", label: "Past due", help: "Stays live for 72 hours after the paid-until date." },
  { id: "canceled", label: "Canceled", help: "Off straight away." },
  { id: "expired", label: "Expired", help: "Off straight away." },
];

/** IST end of day for a YYYY-MM-DD date input. */
const endOfDayIST = (d: string) => (d ? `${d}T23:59:59+05:30` : undefined);
const toDateInput = (iso?: string) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "");

function BillingModal({
  courtID,
  initial,
  onClose,
  onSaved,
}: {
  courtID: string;
  initial: { status: CourtStatus; trialEndsAt?: string; periodEnd?: string };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [status, setStatus] = useState<CourtStatus>(initial.status);
  const [trial, setTrial] = useState(toDateInput(initial.trialEndsAt));
  const [period, setPeriod] = useState(toDateInput(initial.periodEnd));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const help = STATUSES.find((s) => s.id === status)?.help;
  const needsPeriod = status === "active" && !period;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await foodCourts.setSubscription(courtID, {
        status,
        trial_ends_at: trial !== toDateInput(initial.trialEndsAt) ? endOfDayIST(trial) : undefined,
        current_period_end: period !== toDateInput(initial.periodEnd) ? endOfDayIST(period) : undefined,
      });
      await onSaved();
      toast("ok", "Billing updated");
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <Modal title="Change billing" onClose={() => !busy && onClose()}>
      <div className="space-y-4">
        <Field label="Status" hint={help}>
          <select value={status} onChange={(e) => setStatus(e.target.value as CourtStatus)} className={inputClass}>
            {STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trial ends">
            <input type="date" value={trial} onChange={(e) => setTrial(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Paid until" error={needsPeriod ? "Set the paid-until date for an active court" : undefined}>
            <input type="date" value={period} onChange={(e) => setPeriod(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <p className="text-xs text-slate-500">Dates are the end of that day, India time. Qrave doesn&apos;t charge the court from here; this records what was agreed.</p>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} busy={busy} disabled={needsPeriod}>
            Save billing
          </Button>
        </div>
      </div>
    </Modal>
  );
}
