"use client";

import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";

const storageKey = "qrave.sa.theme";

type Props = {
  inline?: boolean;
  compact?: boolean;
  className?: string;
};

function applyTheme(nextTheme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", nextTheme === "dark");
  root.style.colorScheme = nextTheme;
  window.localStorage.setItem(storageKey, nextTheme);
}

export default function ThemeToggle({
  inline = false,
  compact = false,
  className = "",
}: Props) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme =
      stored === "dark" || stored === "light"
        ? stored
        : prefersDark
          ? "dark"
          : "light";
    setTheme(initialTheme);
    applyTheme(initialTheme);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      const nextTheme = event.newValue === "dark" ? "dark" : "light";
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      className={
        inline
          ? compact
            ? `inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--text)] shadow-sm shadow-slate-950/10 transition hover:-translate-y-0.5 hover:shadow-md ${className}`
            : `inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--text)] shadow-sm shadow-slate-950/10 transition hover:-translate-y-0.5 hover:shadow-md ${className}`
          : `fixed right-4 top-4 z-[60] inline-flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] shadow-lg shadow-slate-950/10 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl ${className}`
      }
    >
      {theme === "dark" ? <SunMedium size={16} /> : <MoonStar size={16} />}
      <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </button>
  );
}
