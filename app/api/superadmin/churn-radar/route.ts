import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listRestaurants } from "@/lib/superadmin/queries";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const restaurants = await listRestaurants(30);

    const atRisk = restaurants
      .filter((r) => (r.churnSignals?.riskScore ?? 0) >= 20 || r.status === "churn-risk")
      .sort((a, b) => (b.churnSignals?.riskScore ?? 0) - (a.churnSignals?.riskScore ?? 0));

    const metrics = {
      criticalCount: restaurants.filter((r) => r.churnSignals?.riskLevel === "critical").length,
      highCount: restaurants.filter((r) => r.churnSignals?.riskLevel === "high").length,
      moderateCount: restaurants.filter((r) => r.churnSignals?.riskLevel === "moderate").length,
      healthyCount: restaurants.filter((r) => r.churnSignals?.riskLevel === "low").length,
      totalDeadScans7d: restaurants.reduce((sum, r) => sum + (r.churnSignals?.deadQrScans7d ?? 0), 0),
      totalScans7d: restaurants.reduce((sum, r) => sum + (r.churnSignals?.totalQrScans7d ?? 0), 0),
    };

    return NextResponse.json({
      metrics,
      atRiskRestaurants: atRisk,
    });
  } catch (err) {
    console.error("churn radar error:", err);
    return NextResponse.json({ error: "Failed to load churn radar" }, { status: 500 });
  }
}
