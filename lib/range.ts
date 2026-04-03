import { RevenueRange } from "@/lib/types";

export function parseRange(raw: string | null): RevenueRange {
  if (raw === "week" || raw === "month" || raw === "year") return raw;
  return "month";
}
