import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { createCouponCampaign, listCouponCampaigns } from "@/lib/superadmin/queries";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;
  try {
    const data = await listCouponCampaigns();
    return NextResponse.json(data);
  } catch (err) {
    console.error("coupon campaigns list error:", err);
    return NextResponse.json({ error: "failed to list coupon campaigns" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    if (!body?.restaurantId || !body?.name || !body?.couponCode || !body?.discountKind || body?.discountValue == null) {
      return NextResponse.json(
        { error: "restaurantId, name, couponCode, discountKind and discountValue required" },
        { status: 400 },
      );
    }

    const created = await createCouponCampaign({
      restaurantId: String(body.restaurantId),
      name: String(body.name),
      couponCode: String(body.couponCode),
      discountKind: String(body.discountKind) as "percent" | "fixed" | "fixed_price",
      discountValue: Number(body.discountValue),
      startsAt: body.startsAt ? String(body.startsAt) : null,
      endsAt: body.endsAt ? String(body.endsAt) : null,
      maxRedemptions: body.maxRedemptions == null || body.maxRedemptions === "" ? null : Number(body.maxRedemptions),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (String(err?.message || "").includes("duplicate key")) {
      return NextResponse.json({ error: "coupon code already exists for this restaurant" }, { status: 409 });
    }
    console.error("coupon campaign create error:", err);
    return NextResponse.json({ error: "failed to create coupon campaign" }, { status: 500 });
  }
}

