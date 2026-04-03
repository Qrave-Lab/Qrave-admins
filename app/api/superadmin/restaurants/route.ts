import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { createRestaurantWithOwner, listRestaurants, resolveRange } from "@/lib/superadmin/queries";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const { days } = resolveRange(url.searchParams.get("range") || "month");
    const data = await listRestaurants(days);
    return NextResponse.json(data);
  } catch (err) {
    console.error("restaurants error:", err);
    return NextResponse.json({ error: "failed to list restaurants" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body?.brandName || !body?.ownerEmail || !body?.ownerPassword) {
      return NextResponse.json({ error: "brandName, ownerEmail and ownerPassword are required" }, { status: 400 });
    }
    const created = await createRestaurantWithOwner({
      brandName: String(body.brandName || ""),
      locationName: String(body.locationName || ""),
      currency: String(body.currency || "INR"),
      plan: String(body.plan || "monthly_499"),
      ownerEmail: String(body.ownerEmail || ""),
      ownerPassword: String(body.ownerPassword || ""),
      initialTables: Number(body.initialTables || 8),
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "Owner email already exists" }, { status: 409 });
    }
    console.error("create restaurant error:", err);
    return NextResponse.json({ error: "failed to create restaurant" }, { status: 500 });
  }
}
