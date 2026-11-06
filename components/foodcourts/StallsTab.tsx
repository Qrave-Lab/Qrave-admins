"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Check, Eye, EyeOff, Loader2, Pencil, Plus, Search, Store, Trash2, X } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, Empty, Field, Modal, errorText, inputClass, useToast } from "./ui";
import type { TabProps } from "./types";
import { cuisineLabel, foodCourts, type Stall, type StallCandidate } from "@/lib/foodCourts";

const parseTags = (s: string) =>
  s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

export default function StallsTab({ detail, reload, canManage }: TabProps) {
  const toast = useToast();
  const { court, stalls } = detail;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Stall | null>(null);
  const [busyID, setBusyID] = useState<string | null>(null);

  const toggleListed = async (s: Stall) => {
    setBusyID(s.restaurantId);
    try {
      await foodCourts.updateStall(court.id, s.restaurantId, { is_listed: !s.isListed });
      await reload();
      toast("ok", s.isListed ? `${s.name} hidden from diners` : `${s.name} shown to diners`);
    } catch (e) {
      toast("error", errorText(e));
    } finally {
      setBusyID(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-600">
          Each stall is a normal Qrave restaurant and keeps managing its own menu, photos and 3D dishes. Joining a court turns off its QR ordering; the court pays for it.
        </p>
        {canManage && (
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Add stall
          </Button>
        )}
      </div>

      <Card>
        {stalls.length === 0 ? (
          <Empty icon={<Store size={32} />} title="No stalls yet">
            {canManage ? "Add the restaurants that trade in this food court." : null}
          </Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stalls.map((s) =>
              editing === s.restaurantId ? (
                <EditStallRow
                  key={s.restaurantId}
                  stall={s}
                  onCancel={() => setEditing(null)}
                  onSave={async (patch) => {
                    await foodCourts.updateStall(court.id, s.restaurantId, patch);
                    await reload();
                    setEditing(null);
                    toast("ok", `${s.name} updated`);
                  }}
                />
              ) : (
                <li key={s.restaurantId} className="flex flex-wrap items-center gap-3 py-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-base font-bold text-slate-400">
                    {s.thumbnails[0] || s.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.thumbnails[0] || s.logoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      s.name.slice(0, 1)
                    )}
                  </div>
                  <div className={`min-w-0 flex-1 ${s.isListed ? "" : "opacity-60"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/restaurants/${s.restaurantId}`} className="font-semibold text-slate-900 hover:underline">
                        {s.name}
                      </Link>
                      {s.stallLabel && <span className="text-sm text-slate-500">{s.stallLabel}</span>}
                      {!s.isListed && <Badge className="border-slate-200 bg-slate-100 text-slate-600">Hidden</Badge>}
                      {s.itemCount === 0 && <Badge className="border-amber-200 bg-amber-50 text-amber-800">No dishes yet</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {s.itemCount} {s.itemCount === 1 ? "dish" : "dishes"}
                      {s.arItemCount > 0 && (
                        <span className="ml-1 inline-flex items-center gap-0.5">
                          · <Box size={12} /> {s.arItemCount} in 3D
                        </span>
                      )}
                      {s.cuisineTags.length > 0 && <> · {s.cuisineTags.map(cuisineLabel).join(", ")}</>}
                      {s.opensAt && s.closesAt && (
                        <>
                          {" "}
                          · {s.opensAt}–{s.closesAt}
                        </>
                      )}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <IconButton
                        label={s.isListed ? "Hide from diners" : "Show to diners"}
                        onClick={() => toggleListed(s)}
                        busy={busyID === s.restaurantId}
                      >
                        {s.isListed ? <Eye size={16} /> : <EyeOff size={16} />}
                      </IconButton>
                      <IconButton label="Edit label and cuisines" onClick={() => setEditing(s.restaurantId)}>
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton label="Remove from food court" onClick={() => setRemoving(s)} danger>
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </Card>

      {adding && (
        <AddStallModal
          courtID={court.id}
          onClose={() => setAdding(false)}
          onAdded={async (name) => {
            await reload();
            toast("ok", `${name} added`);
          }}
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Remove stall"
          danger
          confirmLabel="Remove stall"
          message={
            <>
              Remove <strong>{removing.name}</strong> from {court.name}? Diners stop seeing its menu here, and its own Qrave subscription applies again. QR ordering stays off until
              the restaurant turns it back on.
            </>
          }
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await foodCourts.removeStall(court.id, removing.restaurantId);
            await reload();
            toast("ok", `${removing.name} removed`);
          }}
        />
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger = false,
  busy = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 transition disabled:opacity-50 ${danger ? "text-slate-400 hover:bg-red-50 hover:text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : children}
    </button>
  );
}

function EditStallRow({
  stall,
  onCancel,
  onSave,
}: {
  stall: Stall;
  onCancel: () => void;
  onSave: (patch: { stall_label: string; cuisine_tags: string[] }) => Promise<void>;
}) {
  const [label, setLabel] = useState(stall.stallLabel);
  const [tags, setTags] = useState(stall.cuisineTags.map(cuisineLabel).join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await onSave({ stall_label: label.trim(), cuisine_tags: parseTags(tags) });
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };
  return (
    <li className="space-y-2 py-3.5">
      <p className="font-semibold text-slate-900">{stall.name}</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. Stall 12" maxLength={60} className={inputClass} aria-label="Stall label" />
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Cuisines, comma separated: South Indian, Biryani"
          className={inputClass}
          aria-label="Cuisines"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <div className="flex gap-1">
          <Button onClick={save} busy={busy} aria-label="Save">
            <Check size={16} />
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={busy} aria-label="Cancel">
            <X size={16} />
          </Button>
        </div>
      </div>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </li>
  );
}

function AddStallModal({ courtID, onClose, onAdded }: { courtID: string; onClose: () => void; onAdded: (name: string) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; rows: StallCandidate[] } | null>(null);
  const [searchError, setSearchError] = useState("");
  const [picked, setPicked] = useState<StallCandidate | null>(null);
  const [label, setLabel] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      foodCourts
        .candidates(query)
        .then((rows) => !cancelled && (setResults({ q: query, rows }), setSearchError("")))
        .catch((e) => !cancelled && setSearchError(errorText(e)));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const searching = results?.q !== query;

  const add = async () => {
    if (!picked) return;
    setBusy(true);
    setError("");
    try {
      await foodCourts.addStall(courtID, { restaurant_id: picked.restaurantId, stall_label: label.trim() || undefined, cuisine_tags: parseTags(tags) });
      await onAdded(picked.name);
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };

  return (
    <Modal title="Add stall" onClose={() => !busy && onClose()} wide>
      {!picked ? (
        <div className="space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants by name, address or owner email"
              className={`${inputClass} pl-9`}
              autoFocus
            />
          </div>
          <p className="text-xs text-slate-500">Only restaurants that aren&apos;t already in a food court are listed.</p>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
            {searchError ? (
              <p className="p-4 text-sm text-red-600">{searchError}</p>
            ) : !results || (searching && results.rows.length === 0) ? (
              <div className="flex justify-center p-6 text-slate-400">
                <Loader2 className="animate-spin" size={18} />
              </div>
            ) : results.rows.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No matching restaurants.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.rows.map((r) => (
                  <li key={r.restaurantId}>
                    <button onClick={() => setPicked(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{r.name}</p>
                        <p className="truncate text-xs text-slate-500">{[r.ownerEmail, r.address].filter(Boolean).join(" · ") || "No owner on file"}</p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">
                        {r.itemCount} {r.itemCount === 1 ? "dish" : "dishes"}
                        {r.arItemCount > 0 ? ` · ${r.arItemCount} 3D` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <p className="text-xs text-slate-500">
            New stall? Create it first in{" "}
            <Link href="/restaurants" className="font-semibold text-slate-800 underline">
              Restaurants
            </Link>
            , then add it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{picked.name}</p>
              <p className="truncate text-xs text-slate-500">{picked.ownerEmail || picked.address}</p>
            </div>
            <button onClick={() => setPicked(null)} className="text-xs font-semibold text-slate-600 underline" disabled={busy}>
              Change
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stall label" hint="Where diners find it, e.g. Stall 12 or Level 2 East">
              <input value={label} onChange={(e) => setLabel(e.target.value)} className={inputClass} maxLength={60} autoFocus />
            </Field>
            <Field label="Cuisines" hint="Comma separated; used for the cuisine filters">
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="South Indian, Biryani" />
            </Field>
          </div>
          {picked.itemCount === 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">This restaurant has no dishes yet, so diners will see an empty menu until it adds some.</p>
          )}
          <p className="text-xs text-slate-500">Adding the stall turns off its QR ordering and moves its billing to this food court.</p>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={add} busy={busy}>
              Add {picked.name}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
