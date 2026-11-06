"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  registerFeedbackHost,
  type ConfirmOptions,
  type ToastItem,
} from "@/lib/ui/feedback";

const TOAST_MS = 5000;

const toneStyles = {
  success: { icon: CheckCircle2, cls: "text-emerald-600" },
  error: { icon: AlertCircle, cls: "text-red-600" },
  info: { icon: Info, cls: "text-slate-600" },
} as const;

type PendingConfirm = ConfirmOptions & { resolve: (v: boolean) => void };

export default function FeedbackHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return registerFeedbackHost({
      toast: (t) => {
        setToasts((prev) => [...prev.slice(-3), t]);
        window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), TOAST_MS);
      },
      confirm: (o, resolve) => setPending({ ...o, resolve }),
    });
  }, []);

  useEffect(() => {
    if (pending) confirmRef.current?.focus();
  }, [pending]);

  const settle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <>
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      >
        {toasts.map((t) => {
          const { icon: Icon, cls } = toneStyles[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-900/10"
            >
              <Icon size={18} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden />
              <p className="flex-1 text-sm font-medium leading-snug text-slate-800">{t.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {pending && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && settle(false)}
        >
          <div className="modal-in w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="confirm-title" className="text-lg font-bold tracking-tight text-slate-900">
              {pending.title ?? "Are you sure?"}
            </h2>
            <p id="confirm-message" className="mt-2 text-sm leading-relaxed text-slate-600">
              {pending.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                data-dialog-close
                onClick={() => settle(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => settle(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  pending.tone === "default" ? "bg-slate-900 hover:bg-slate-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {pending.confirmLabel ?? "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
