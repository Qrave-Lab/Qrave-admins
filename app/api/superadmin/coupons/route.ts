import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listCouponCampaigns } from "@/lib/superadmin/queries";

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

