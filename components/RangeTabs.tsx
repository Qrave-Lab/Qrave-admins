"use client";

import { RevenueRange } from "@/lib/types";
import { motion } from "framer-motion";

type Props = {
  value: RevenueRange;
  onChange: (next: RevenueRange) => void;
};

const ranges: RevenueRange[] = ["week", "month", "year"];

export default function RangeTabs({ value, onChange }: Props) {
  return (
    <div className="relative inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/50 p-1 shadow-sm">
      {ranges.map((range) => {
        const isActive = value === range;
        return (
          <button
            key={range}
            className={`
              relative z-10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors duration-200 rounded-lg
              ${isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"}
            `}
            onClick={() => onChange(range)}
            type="button"
          >
            {isActive && (
              <motion.div
                layoutId="range-tab-bubble"
                className="absolute inset-0 z-0 rounded-lg bg-white shadow-sm ring-1 ring-slate-900/5"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{range}</span>
          </button>
        );
      })}
    </div>
  );
}
