import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listAuditLogs, getAuditStats } from "@/lib/audit";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const qadmin = url.searchParams.get("qadmin") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const search = url.searchParams.get("search") || undefined;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50;
    const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0;
    const includeStats = url.searchParams.get("stats") === "true";

    const { logs, total } = await listAuditLogs({
      qadmin,
      category,
      search,
      limit,
      offset,
    });

    let stats = null;
    if (includeStats) {
      stats = await getAuditStats();
    }

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      stats,
    });
  } catch (err) {
    console.error("audit-logs list error:", err);
    return NextResponse.json({ error: "failed to list audit logs" }, { status: 500 });
  }
}
