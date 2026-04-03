import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listCouponRedemptions } from "@/lib/superadmin/queries";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;
  try {
    const url = new URL(request.url);
    const campaignID = url.searchParams.get("campaignId") || undefined;
    const data = await listCouponRedemptions(campaignID);
    return NextResponse.json(data);
  } catch (err) {
    console.error("coupon redemptions list error:", err);
    return NextResponse.json({ error: "failed to list coupon redemptions" }, { status: 500 });
  }
}

