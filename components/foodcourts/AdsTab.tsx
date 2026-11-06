"use client";

import { useCallback, useEffect, useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { Button, Card, ConfirmDialog, Empty, Field, Modal, Spinner, errorText, inputClass, useToast } from "./ui";
import type { TabProps } from "./types";
import { foodCourts, formatIST, type Dish, type Placement } from "@/lib/foodCourts";

const SLOT = { top_stall: "Top of stall list", featured_item: "Featured dish" } as const;
const statusOf = (p: Placement, now: number) => (now < +new Date(p.startsAt) ? "Scheduled" : now >= +new Date(p.endsAt) ? "Ended" : "Running");
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function AdsTab({ detail, canManage }: TabProps) {
  const toast = useToast();
  const { court, stalls } = detail;
  const [rows, setRows] = useState<{ at: number; list: Placement[] } | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [ending, setEnding] = useState<Placement | null>(null);

  const load = useCallback(() => {
    foodCourts.placements(court.id).then((list) => (setRows({ at: Date.now(), list }), setError(""))).catch((e) => setError(errorText(e)));
  }, [court.id]);
  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-600">Paid spots are always labeled &ldquo;Sponsored&rdquo;. One stall can hold the top spot at a time; up to 3 dishes can be featured. Prices are recorded only.</p>
        {canManage && stalls.some((s) => s.isListed) && (
          <Button onClick={() => setCreating(true)}><Plus size={16} /> New ad</Button>
        )}
      </div>
      <Card>
        {error ? <p className="text-sm text-red-600">{error}</p> : !rows ? <Spinner /> : rows.list.length === 0 ? (
          <Empty icon={<Megaphone size={32} />} title="No ads yet" />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="py-2">Stall</th><th className="py-2">Spot</th><th className="py-2">When (IST)</th><th className="py-2 text-right">Seen by</th><th className="py-2 text-right">Tapped by</th><th className="py-2 text-right">Price</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.list.map((p) => {
                  const st = statusOf(p, rows.at);
                  return (
                    <tr key={p.id} className={st === "Ended" ? "text-slate-400" : ""}>
                      <td className="py-2.5 font-medium">{p.restaurantName}</td>
                      <td className="py-2.5">{SLOT[p.slot]}{p.menuItemName && <span className="block text-xs text-slate-500">{p.menuItemName}</span>}</td>
                      <td className="py-2.5 text-xs"><strong className="mr-1">{st}</strong>{formatIST(p.startsAt, true)} – {formatIST(p.endsAt, true)}</td>
                      <td className="py-2.5 text-right tabular-nums">{p.impressions}</td>
                      <td className="py-2.5 text-right tabular-nums">{p.clicks}{p.impressions > 0 && <span className="ml-1 text-xs text-slate-400">({Math.round((p.clicks / p.impressions) * 100)}%)</span>}</td>
                      <td className="py-2.5 text-right tabular-nums">₹{(p.priceCents / 100).toLocaleString("en-IN")}</td>
                      <td className="py-2.5 text-right">{canManage && st !== "Ended" && <button onClick={() => setEnding(p)} className="text-xs font-bold text-red-600 hover:underline">{st === "Scheduled" ? "Cancel" : "End now"}</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {creating && <NewAd courtID={court.id} stalls={stalls.filter((s) => s.isListed)} onClose={() => setCreating(false)} onDone={() => (load(), toast("ok", "Ad scheduled"))} />}
      {ending && (
        <ConfirmDialog title="End ad" danger confirmLabel="End ad" message={<>End this ad for <strong>{ending.restaurantName}</strong>?</>}
          onClose={() => setEnding(null)} onConfirm={async () => { await foodCourts.endPlacement(court.id, ending.id); load(); toast("ok", "Ad ended"); }} />
      )}
    </div>
  );
}

function NewAd({ courtID, stalls, onClose, onDone }: { courtID: string; stalls: TabProps["detail"]["stalls"]; onClose: () => void; onDone: () => void }) {
  const [rid, setRid] = useState("");
  const [slot, setSlot] = useState<Placement["slot"]>("top_stall");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [item, setItem] = useState("");
  const [range] = useState(() => ({ s: localInput(new Date()), e: localInput(new Date(Date.now() + 7 * 864e5)) }));
  const [start, setStart] = useState(range.s);
  const [end, setEnd] = useState(range.e);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!rid || slot !== "featured_item") return;
    let c = false;
    foodCourts.dishes(courtID, rid).then((d) => !c && setDishes(d)).catch(() => !c && setDishes([]));
    return () => { c = true; };
  }, [courtID, rid, slot]);

  const ready = rid && start && end && new Date(end) > new Date(start) && (slot === "top_stall" || item);
  const submit = async () => {
    setBusy(true); setError("");
    try {
      await foodCourts.createPlacement(courtID, { restaurant_id: rid, slot, menu_item_id: slot === "featured_item" ? item : undefined, starts_at: new Date(start).toISOString(), ends_at: new Date(end).toISOString(), price_cents: Math.round((parseFloat(price) || 0) * 100) });
      onDone(); onClose();
    } catch (e) { setError(errorText(e)); setBusy(false); }
  };
  return (
    <Modal title="New ad" onClose={() => !busy && onClose()}>
      <div className="space-y-4">
        <Field label="Stall"><select value={rid} onChange={(e) => (setRid(e.target.value), setItem(""))} className={inputClass}><option value="">Choose a stall</option>{stalls.map((s) => <option key={s.restaurantId} value={s.restaurantId}>{s.name}</option>)}</select></Field>
        <Field label="Spot"><select value={slot} onChange={(e) => setSlot(e.target.value as Placement["slot"])} className={inputClass}><option value="top_stall">Top of stall list</option><option value="featured_item">Featured dish</option></select></Field>
        {slot === "featured_item" && <Field label="Dish"><select value={item} onChange={(e) => setItem(e.target.value)} className={inputClass} disabled={!rid}><option value="">{rid ? "Choose a dish" : "Choose a stall first"}</option>{dishes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts"><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} /></Field>
          <Field label="Ends"><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Price (₹, for records)"><input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="0" /></Field>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={submit} busy={busy} disabled={!ready}>Schedule ad</Button></div>
      </div>
    </Modal>
  );
}
