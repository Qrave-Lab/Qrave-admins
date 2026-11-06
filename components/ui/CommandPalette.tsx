"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { allLinks } from "@/lib/nav";

export const OPEN_PALETTE_EVENT = "qrave:open-palette";

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? allLinks.filter((l) => l.label.toLowerCase().includes(q)) : allLinks;
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setIndex(0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const go = (href: string) => {
    close();
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Jump to page"
      className="fixed inset-0 z-[75] flex items-start justify-center bg-slate-900/40 p-4 pt-[15vh]"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <div className="modal-in w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4">
          <Search size={16} className="text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && results[index]) {
                go(results[index].href);
              }
            }}
            aria-label="Search pages"
            placeholder="Jump to a page…"
            className="h-12 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400"
          />
          <button type="button" data-dialog-close onClick={close} className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
            Esc
          </button>
        </div>
        <ul role="listbox" className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">No pages match “{query}”.</li>}
          {results.map((l, i) => {
            const Icon = l.icon;
            return (
              <li key={l.href} role="option" aria-selected={i === index}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(l.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                    i === index ? "bg-slate-900 text-white" : "text-slate-700"
                  }`}
                >
                  <Icon size={16} aria-hidden />
                  <span className="flex-1">{l.label}</span>
                  {i === index && <CornerDownLeft size={14} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
