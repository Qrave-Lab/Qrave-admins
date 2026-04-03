import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { getOverview } from "@/lib/superadmin/queries";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "month";
    const data = await getOverview(range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("overview error:", err);
    return NextResponse.json({ error: "failed to load overview" }, { status: 500 });
  }
}
