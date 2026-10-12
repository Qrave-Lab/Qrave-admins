import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public endpoint for Diner Web Apps and Waiter POS terminals
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");
    const audience = searchParams.get("audience") || "diners";

    let query = `
      SELECT 
        id,
        title,
        message,
        severity,
        scope,
        restaurant_id,
        target_audience,
        starts_at,
        expires_at
      FROM platform_broadcast_banners
      WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        AND starts_at <= NOW()
        AND (target_audience = 'all' OR target_audience = $1)
    `;

    const params: any[] = [audience];

    if (restaurantId) {
      query += ` AND (scope = 'global' OR restaurant_id = $2)`;
      params.push(restaurantId);
    } else {
      query += ` AND scope = 'global'`;
    }

    query += ` ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, starts_at DESC`;

    const { rows } = await db.query(query, params);

    const res = NextResponse.json({ banners: rows });
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.headers.set("Cache-Control", "public, s-maxage=10, stale-while-revalidate=30");
    return res;
  } catch (err: any) {
    console.error("Public active broadcasts error:", err);
    return NextResponse.json({ banners: [] }, { status: 200 });
  }
}

export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return res;
}
