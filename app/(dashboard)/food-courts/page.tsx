"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, QrCode, Search, Store, Users, UtensilsCrossed } from "lucide-react";
import TopBar from "@/components/TopBar";
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  Spinner,
  ToastProvider,
  errorText,
  inputClass,
  useFoodCourtAccess,
  useToast,
} from "@/components/foodcourts/ui";
import { SLUG_RE, TONE, billingState, foodCourts, formatIST, slugify, type FoodCourtSummary } from "@/lib/foodCourts";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "attention", label: "Needs attention" },
  { id: "archived", label: "Archived" },
] as const;

export default function FoodCourtsPage() {
  return (
    <ToastProvider>
      <FoodCourtsList />
    </ToastProvider>
  );
}

function FoodCourtsList() {
  const { canManage } = useFoodCourtAccess();
  const toast = useToast();
  const [courts, setCourts] = useState<FoodCourtSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    foodCourts
      .list()
      .then((c) => {
        setCourts(c);
        setLoadError("");
      })
      .catch((e) => setLoadError(errorText(e)));
  }, []);
  useEffect(load, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (courts || []).filter((c) => {
      const st = billingState(c);
      if (filter === "live" && !st.live) return false;
      if (filter === "attention" && (c.isArchived || (st.live && st.tone !== "amber"))) return false;
      if (filter === "archived" && !c.isArchived) return false;
      if (filter !== "archived" && filter !== "all" && c.isArchived) return false;
      return !q || c.name.toLowerCase().includes(q) || c.slug.includes(q) || c.city.toLowerCase().includes(q);
    });
  }, [courts, query, filter]);

  const totals = useMemo(() => {
    const live = (courts || []).filter((c) => billingState(c).live);
    return {
      live: live.length,
      stalls: live.reduce((n, c) => n + c.stallCount, 0),
      visitors: live.reduce((n, c) => n + c.visitors7d, 0),
      ads: live.reduce((n, c) => n + c.activeAds, 0),
    };
  }, [courts]);

  return (
    <>
      <TopBar title="Food courts" subtitle="Courts, stalls, operators, QR codes and ads." />

      <section className="mx-auto max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 xl:px-8">
        <dl className="flex flex-wrap items-end gap-x-12 gap-y-4">
          <div>
            <dt className="text-sm font-semibold text-slate-500">Live courts</dt>
            <dd className="mt-1 text-4xl font-bold tracking-tight tabular-nums text-slate-900">{totals.live}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Stalls in live courts</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{totals.stalls}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Visitors, 7 days</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{totals.visitors.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-slate-500">Ads running</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{totals.ads}</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, link or city"
                className={`${inputClass} pl-9`}
                aria-label="Search food courts"
              />
            </div>
            <div role="group" aria-label="Filter food courts" className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filter === f.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          {canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> New food court
            </Button>
          )}
        </div>

        {loadError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load food courts: {loadError}{" "}
            <button onClick={load} className="font-semibold underline">
              Retry
            </button>
          </div>
        ) : !courts ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty icon={<UtensilsCrossed size={32} />} title={courts.length === 0 ? "No food courts yet" : "No food courts match"}>
            {courts.length === 0 && canManage ? "Create one, then add its stalls, an operator and QR codes." : null}
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((c) => (
              <CourtCard key={c.id} court={c} />
            ))}
          </div>
        )}
      </section>

      {creating && (
        <CreateCourtModal
          existingSlugs={(courts || []).map((c) => c.slug)}
          onClose={() => setCreating(false)}
          onCreated={(name) => {
            toast("ok", `${name} created`);
            load();
          }}
        />
      )}
    </>
  );
}

function CourtCard({ court: c }: { court: FoodCourtSummary }) {
  const st = billingState(c);
  const until = c.subscriptionStatus === "trialing" ? c.trialEndsAt : c.currentPeriodEnd;
  return (
    <Link
      href={`/food-courts/${c.id}`}
      className={`group block rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm ${c.isArchived ? "opacity-70" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-slate-900">{c.name}</h3>
          <p className="truncate text-sm text-slate-500">
            {c.city ? `${c.city} · ` : ""}/fc/{c.slug}
          </p>
        </div>
        <Badge className={TONE[st.tone]}>{st.label}</Badge>
      </div>
      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Metric icon={<Store size={14} />} label="Stalls" value={c.stallCount} />
        <Metric icon={<Users size={14} />} label="Operators" value={c.operatorCount} />
        <Metric icon={<QrCode size={14} />} label="QR codes" value={c.qrCount} />
        <Metric icon={<Megaphone size={14} />} label="Ads" value={c.activeAds} />
      </dl>
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span>
          <strong className="font-semibold text-slate-800">{c.visitors7d.toLocaleString("en-IN")}</strong> visitors in 7 days
        </span>
        {until && !c.isArchived && <span>{c.subscriptionStatus === "trialing" ? "Trial until" : "Paid until"} {formatIST(until)}</span>}
      </div>
      {(c.stallCount === 0 || c.operatorCount === 0 || c.qrCount === 0) && !c.isArchived && (
        <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
          Setup incomplete: {[c.stallCount === 0 && "stalls", c.operatorCount === 0 && "an operator", c.qrCount === 0 && "QR codes"].filter(Boolean).join(", ")}
        </p>
      )}
    </Link>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <dd className="flex items-center justify-center gap-1 text-base font-bold tabular-nums text-slate-900">
        <span className="text-slate-400">{icon}</span>
        {value}
      </dd>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
    </div>
  );
}

function CreateCourtModal({
  existingSlugs,
  onClose,
  onCreated,
}: {
  existingSlugs: string[];
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [opensAt, setOpensAt] = useState("10:00");
  const [closesAt, setClosesAt] = useState("22:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const slugError = !effectiveSlug
    ? ""
    : effectiveSlug.length < 3
      ? "At least 3 characters"
      : !SLUG_RE.test(effectiveSlug)
        ? "Lowercase letters, numbers and single dashes only"
        : existingSlugs.includes(effectiveSlug)
          ? "Another food court already uses this link"
          : "";
  const ready = name.trim().length > 0 && effectiveSlug.length >= 3 && !slugError;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError("");
    try {
      const court = await foodCourts.create({
        name: name.trim(),
        slug: effectiveSlug,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        opens_at: opensAt || undefined,
        closes_at: closesAt || undefined,
      });
      onCreated(court.name);
      router.push(`/food-courts/${court.id}?tab=stalls`);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="New food court" onClose={() => !busy && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Lulu Mall Food Court" autoFocus maxLength={120} required />
        </Field>
        <Field label="Link" error={slugError} hint={effectiveSlug ? <>Diners open /fc/{effectiveSlug}</> : "Filled in from the name"}>
          <input
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            className={inputClass}
            placeholder="lulu-kochi"
            maxLength={60}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} placeholder="Kochi" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Opens">
              <input type="time" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Closes">
              <input type="time" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} className={inputClass} />
            </Field>
          </div>
        </div>
        <Field label="Address">
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="Level 3, Lulu Mall, Edappally" />
        </Field>
        <p className="text-xs text-slate-500">Starts a 30-day trial. Stalls without their own hours use these court hours.</p>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" busy={busy} disabled={!ready}>
            Create food court
          </Button>
        </div>
      </form>
    </Modal>
  );
}
