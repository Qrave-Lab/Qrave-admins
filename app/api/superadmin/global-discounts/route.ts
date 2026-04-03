import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { createGlobalDiscount, listGlobalDiscounts } from "@/lib/superadmin/queries";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;
  try {
    const data = await listGlobalDiscounts();
    return NextResponse.json(data);
  } catch (err) {
    console.error("global discounts list error:", err);
    return NextResponse.json({ error: "failed to list global discounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;
  try {
    const body = await request.json();
    if (!body?.name || !body?.discountType || !body?.discountValue) {
      return NextResponse.json({ error: "name, discountType and discountValue required" }, { status: 400 });
    }
    const actor = await requireSessionEmail();
    const created = await createGlobalDiscount({
      name: String(body.name || ""),
      code: body.code ? String(body.code) : null,
      discountType: String(body.discountType || "percent") as "percent" | "flat",
      discountValue: Number(body.discountValue || 0),
      startsAt: body.startsAt ? String(body.startsAt) : null,
      endsAt: body.endsAt ? String(body.endsAt) : null,
      createdBy: actor,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "discount code already exists" }, { status: 409 });
    }
    console.error("global discount create error:", err);
    return NextResponse.json({ error: "failed to create global discount" }, { status: 500 });
  }
}

