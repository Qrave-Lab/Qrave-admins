import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import {
  getRestaurantEffectiveFeatures,
  updateRestaurantPlanAndFeatures,
  ALL_FEATURES,
  listAllPlans,
} from "@/lib/plans";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const [effective, plans] = await Promise.all([
      getRestaurantEffectiveFeatures(id),
      listAllPlans(),
    ]);

    if (!effective) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({
      effective,
      plans,
      allFeatures: ALL_FEATURES,
    });
  } catch (err) {
    console.error("Failed to get restaurant features:", err);
    return NextResponse.json({ error: "Failed to load features" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json();
    const actorUsername = (await requireSessionEmail()) || "superadmin";

    const updated = await updateRestaurantPlanAndFeatures({
      restaurantId: id,
      customPlan: body.customPlan,
      overrides: body.overrides,
      trialEndsAt: body.trialEndsAt,
      notes: body.notes,
      actorUsername,
    });

    if (!updated) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, effective: updated });
  } catch (err) {
    console.error("Failed to update restaurant features:", err);
    return NextResponse.json({ error: "Failed to update features" }, { status: 500 });
  }
}
