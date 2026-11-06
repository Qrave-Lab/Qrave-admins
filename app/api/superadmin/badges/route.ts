import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { listRestaurants } from "@/lib/superadmin/queries";

/** Counts shown as notification badges in the sidebar. Each query is isolated so one failure doesn't blank the rest. */
export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const leadsSince = new URL(request.url).searchParams.get("leadsSince");
  const since = leadsSince && !Number.isNaN(Date.parse(leadsSince)) ? new Date(leadsSince).toISOString() : null;

  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      console.error("badges query failed:", err);
      return fallback;
    }
  };

  const [tickets, leads, atRisk] = await Promise.all([
    safe(async () => {
      const { rows } = await db.query(
        `SELECT COUNT(1)::int AS n FROM staff_feedback WHERE status IN ('open', 'acknowledged')`
      );
      return Number(rows[0]?.n ?? 0);
    }, 0),
    safe(async () => {
      const { rows } = await db.query(
        since
          ? `SELECT COUNT(1)::int AS n FROM contact_requests WHERE created_at > $1::timestamptz`
          : `SELECT COUNT(1)::int AS n FROM contact_requests`,
        since ? [since] : []
      );
      return Number(rows[0]?.n ?? 0);
    }, 0),
    safe(async () => {
      const restaurants = await listRestaurants(30);
      return restaurants.filter((r) => r.status === "churn-risk" || (r.churnSignals?.riskScore ?? 0) >= 45).length;
    }, 0),
  ]);

  return NextResponse.json({ tickets, leads, atRisk });
}
