import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listRevenueSeries, resolveRange } from "@/lib/superadmin/queries";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const rangeRaw = url.searchParams.get("range") || "month";
    const restaurantId = url.searchParams.get("restaurantId") || undefined;
    const { days, bucket } = resolveRange(rangeRaw);
    const data = await listRevenueSeries(days, bucket, restaurantId);
    return NextResponse.json(data);
  } catch (err) {
    console.error("revenue error:", err);
    return NextResponse.json({ error: "failed to load revenue" }, { status: 500 });
  }
}
