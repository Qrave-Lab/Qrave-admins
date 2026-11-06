"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, QrCode, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog, Empty, Field, Modal, errorText, inputClass, useToast } from "./ui";
import type { TabProps } from "./types";
import { generateQrSvg } from "@/lib/qr";
import { dinerBaseUrl, foodCourts, type QRToken } from "@/lib/foodCourts";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export default function QRTab({ detail, reload, canManage }: TabProps) {
  const toast = useToast();
  const { court, qr_tokens: tokens } = detail;
  const [baseUrl, setBaseUrl] = useState(dinerBaseUrl());
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<QRToken | null>(null);
  const base = baseUrl.trim().replace(/\/+$/, "");
  const urlFor = (t: QRToken) => `${base}/fc/qr/${t.token}`;
  const svgs = useMemo(() => new Map(tokens.map((t) => [t.token, generateQrSvg(`${base}/fc/qr/${t.token}`, { size: 160, margin: 2 })])), [tokens, base]);

  const print = () => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return toast("error", "Allow pop-ups to print QR codes");
    const cards = tokens
      .map(
        (t) => `<div class="card"><p class="court">${escapeHtml(court.name)}</p>${svgs.get(t.token)}<p class="cta">Scan for every menu</p><p class="zone">${escapeHtml(t.zoneLabel || "")}</p></div>`,
      )
      .join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(court.name)} QR codes</title><style>
      body{font-family:system-ui,sans-serif;margin:24px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      .card{border:1px solid #e2e8f0;border-radius:16px;padding:16px;text-align:center;break-inside:avoid}
      .court{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ea580c;margin:0 0 8px}
      .cta{font-weight:800;margin:8px 0 2px}.zone{color:#64748b;font-size:12px;margin:0}svg{width:160px;height:160px}
    </style></head><body><div class="grid">${cards}</div><script>window.onload=()=>{window.print()}</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-xl flex-1">
          <Field label="Diner site" hint="Court QR codes open this site's /fc/qr/… link">
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="flex gap-2">
          {tokens.length > 0 && (
            <Button variant="outline" onClick={print}>
              <Printer size={15} /> Print all
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> New QR codes
            </Button>
          )}
        </div>
      </div>
      <Card>
        {tokens.length === 0 ? (
          <Empty icon={<QrCode size={32} />} title="No QR codes yet">
            Make one per table, pillar or entrance. Analytics show which one was scanned.
          </Empty>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {tokens.map((t) => (
              <div key={t.token} className="relative rounded-2xl border border-slate-200 p-3 text-center">
                <div className="mx-auto w-32" dangerouslySetInnerHTML={{ __html: svgs.get(t.token) || "" }} />
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">{t.zoneLabel || "No label"}</p>
                <a href={urlFor(t)} target="_blank" rel="noreferrer" className="block truncate text-[11px] text-slate-500 hover:underline">
                  …/{t.token.slice(-8)}
                </a>
                {canManage && (
                  <button onClick={() => setDeleting(t)} aria-label="Delete QR code" className="absolute right-2 top-2 rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
      {creating && <CreateQRModal courtID={court.id} onClose={() => setCreating(false)} onCreated={async (n) => (await reload(), toast("ok", `${n} QR codes created`))} />}
      {deleting && (
        <ConfirmDialog
          title="Delete QR code"
          danger
          confirmLabel="Delete"
          message={<>Delete the QR code for <strong>{deleting.zoneLabel || "this spot"}</strong>? Printed copies stop working at once.</>}
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await foodCourts.deleteQR(court.id, deleting.token);
            await reload();
            toast("ok", "QR code deleted");
          }}
        />
      )}
    </div>
  );
}

function CreateQRModal({ courtID, onClose, onCreated }: { courtID: string; onClose: () => void; onCreated: (n: number) => Promise<void> }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const zones = text.split("\n").map((z) => z.trim()).filter(Boolean);
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await foodCourts.createQR(courtID, zones);
      await onCreated(zones.length);
      onClose();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };
  return (
    <Modal title="New QR codes" onClose={() => !busy && onClose()}>
      <div className="space-y-4">
        <Field label="One label per line" hint={`${zones.length} QR ${zones.length === 1 ? "code" : "codes"} (up to 200)`}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className={inputClass} placeholder={"Table 1\nTable 2\nEntrance B"} autoFocus />
        </Field>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} busy={busy} disabled={zones.length === 0 || zones.length > 200}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}
