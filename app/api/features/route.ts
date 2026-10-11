import { NextResponse } from "next/server";
import { getRestaurantEffectiveFeatures } from "@/lib/plans";

/**
 * Public/Internal endpoint to evaluate feature flags for a given restaurant.
 * Usage: GET /api/features?restaurantId=...
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "restaurantId parameter is required" }, { status: 400 });
    }

    const effective = await getRestaurantEffectiveFeatures(restaurantId);
    if (!effective) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({
      restaurantId: effective.restaurantId,
      plan: effective.effectivePlanId,
      features: effective.effectiveFeatures,
      isTrialActive: effective.isTrialActive,
      trialEndsAt: effective.trialEndsAt,
    });
  } catch (err) {
    console.error("Feature evaluation error:", err);
    return NextResponse.json({ error: "Failed to evaluate features" }, { status: 500 });
  }
}
