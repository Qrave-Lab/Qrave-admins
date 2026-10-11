import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listAllPlans, ALL_FEATURES, listRestaurantsWithFeatureOverrides } from "@/lib/plans";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const [plans, overrides] = await Promise.all([
      listAllPlans(),
      listRestaurantsWithFeatureOverrides(),
    ]);

    return NextResponse.json({
      plans,
      features: ALL_FEATURES,
      overrides,
    });
  } catch (err) {
    console.error("Failed to load plans:", err);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}
