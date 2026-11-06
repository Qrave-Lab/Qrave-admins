"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { fetchMe, type Me } from "@/lib/foodCourts";

// ─── Permissions ─────────────────────────────────────────────────────────────

/** The signed-in admin. `canManage` is false until loaded, so write buttons never flash. */
export function useFoodCourtAccess() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((m) => !cancelled && setMe(m))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return { me, canManage: Boolean(me?.permissions.includes("foodcourts.manage")) };
}

// ─── Toasts ──────────────────────────────────────────────────────────────────

type Toast = { id: number; kind: "ok" | "error"; text: string };
const ToastContext = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = next.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[70] flex max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium shadow-lg ${
              t.kind === "ok" ? "border-emerald-200 bg-white text-emerald-800" : "border-red-200 bg-white text-red-700"
            }`}
          >
            {t.kind === "ok" ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

export function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Something went wrong";
}

// ─── Building blocks ─────────────────────────────────────────────────────────

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger = false,
  requireText,
  onConfirm,
  onClose,
}: {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** When set, the admin must type this to confirm. */
  requireText?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const ready = !requireText || typed.trim() === requireText;
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <div className="space-y-4 text-sm text-slate-700">
        <div>{message}</div>
        {requireText && (
          <Field label={`Type "${requireText}" to confirm`}>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} autoFocus />
          </Field>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            busy={busy}
            disabled={!ready}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onConfirm();
                onClose();
              } catch (e) {
                setError(errorText(e));
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-500";

export function Field({ label, hint, error, children }: { label: string; hint?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

const VARIANTS = {
  primary: "bg-slate-900 text-white hover:bg-slate-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-slate-600 hover:bg-slate-100",
  outline: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
} as const;

export function Button({
  variant = "primary",
  busy = false,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${className}`}>{children}</span>;
}

export function Card({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold text-slate-900">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-6 py-10 text-center">
      <div className="text-slate-300">{icon}</div>
      <p className="mt-2 text-sm font-semibold text-slate-700">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16 text-slate-400">
      <Loader2 className="animate-spin" />
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </article>
  );
}
