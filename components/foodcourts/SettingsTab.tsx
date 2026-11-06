"use client";

import { useState } from "react";
import { Button, Card, ConfirmDialog, Field, errorText, inputClass, useToast } from "./ui";
import type { TabProps } from "./types";
import { SLUG_RE, foodCourts } from "@/lib/foodCourts";

export default function SettingsTab({ detail, reload, canManage }: TabProps) {
  const toast = useToast();
  const c = detail.court;
  const [f, setF] = useState({ name: c.name, slug: c.slug, city: c.city, address: c.address, logo_url: c.logoUrl, cover_url: c.coverUrl, opens_at: c.opensAt, closes_at: c.closesAt });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [archiving, setArchiving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const original: typeof f = { name: c.name, slug: c.slug, city: c.city, address: c.address, logo_url: c.logoUrl, cover_url: c.coverUrl, opens_at: c.opensAt, closes_at: c.closesAt };
  const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== original[k as keyof typeof f]));
  const slugError = f.slug.length < 3 || !SLUG_RE.test(f.slug) ? "3–60 lowercase letters, numbers and single dashes" : "";

  const save = async () => {
    setBusy(true); setError("");
    try { await foodCourts.update(c.id, changed); await reload(); toast("ok", "Saved"); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <Card title="Details">
        <fieldset disabled={!canManage || busy} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input value={f.name} onChange={set("name")} className={inputClass} maxLength={120} /></Field>
          <Field label="Link" error={slugError} hint={f.slug !== c.slug ? "The old /fc/ link stops working. Printed QR codes keep working." : `/fc/${c.slug}`}><input value={f.slug} onChange={set("slug")} className={inputClass} maxLength={60} /></Field>
          <Field label="City"><input value={f.city} onChange={set("city")} className={inputClass} /></Field>
          <Field label="Address"><input value={f.address} onChange={set("address")} className={inputClass} /></Field>
          <Field label="Opens"><input type="time" value={f.opens_at} onChange={set("opens_at")} className={inputClass} /></Field>
          <Field label="Closes"><input type="time" value={f.closes_at} onChange={set("closes_at")} className={inputClass} /></Field>
          <Field label="Logo URL"><input value={f.logo_url} onChange={set("logo_url")} className={inputClass} placeholder="https://" /></Field>
          <Field label="Cover image URL"><input value={f.cover_url} onChange={set("cover_url")} className={inputClass} placeholder="https://" /></Field>
        </fieldset>
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        {canManage && <div className="mt-4 flex justify-end"><Button onClick={save} busy={busy} disabled={Object.keys(changed).length === 0 || !f.name.trim() || Boolean(slugError)}>Save changes</Button></div>}
      </Card>
      {canManage && (
        <Card title={c.isArchived ? "Restore food court" : "Archive food court"}>
          <p className="text-sm text-slate-600">{c.isArchived ? "Bring the court back: menus, operator sign-in and stall access return (if billing is live)." : "Takes the court offline: diners can't open menus, operators can't sign in, and stalls lose admin access. Nothing is deleted."}</p>
          <Button variant={c.isArchived ? "primary" : "danger"} className="mt-4" onClick={() => setArchiving(true)}>{c.isArchived ? "Restore" : "Archive"}</Button>
        </Card>
      )}
      {archiving && (
        <ConfirmDialog title={c.isArchived ? "Restore food court" : "Archive food court"} danger={!c.isArchived} confirmLabel={c.isArchived ? "Restore" : "Archive"}
          requireText={c.isArchived ? undefined : c.slug} message={c.isArchived ? <>Restore <strong>{c.name}</strong>?</> : <>Archive <strong>{c.name}</strong>? It goes offline straight away.</>}
          onClose={() => setArchiving(false)} onConfirm={async () => { await foodCourts.update(c.id, { is_archived: !c.isArchived }); await reload(); toast("ok", c.isArchived ? "Restored" : "Archived"); }} />
      )}
    </div>
  );
}
