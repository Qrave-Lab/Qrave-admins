import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listTopItems, resolveRange } from "@/lib/superadmin/queries";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const { days } = resolveRange(url.searchParams.get("range") || "month");
    const data = await listTopItems(days);
    return NextResponse.json(data);
  } catch (err) {
    console.error("analytics error:", err);
    return NextResponse.json({ error: "failed to load analytics" }, { status: 500 });
  }
}
