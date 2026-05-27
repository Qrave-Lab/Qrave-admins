import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/superadmin/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, plan } = body;
    const actor = (await requireSessionEmail()) || "superadmin";

    if (action === "update_plan") {
      const validPlans = ["starter", "growth", "pro"];
      const normalizedPlan = (plan || "").toLowerCase().trim();
      
      if (!validPlans.includes(normalizedPlan)) {
        return NextResponse.json({ error: "invalid plan" }, { status: 400 });
      }

      // Fetch old plan for audit logging
      const restRes = await db.query("SELECT subscription_plan FROM restaurants WHERE id = $1", [id]);
      if (restRes.rows.length === 0) {
        return NextResponse.json({ error: "restaurant not found" }, { status: 404 });
      }
      const oldPlan = restRes.rows[0].subscription_plan;

      // Update in DB (Starter -> monthly_499, Growth -> monthly_999, Pro -> monthly_1499)
      const dbPlan = normalizedPlan === "starter" ? "monthly_499" : normalizedPlan === "growth" ? "monthly_999" : "monthly_1499";
      
      await db.query(
        "UPDATE restaurants SET subscription_plan = $1, billing_updated_at = NOW() WHERE id = $2",
        [dbPlan, id]
      );

      // Audit Log
      await logAuditEvent(actor, "UPDATE_SUBSCRIPTION_PLAN", id, "restaurant", { oldPlan, newPlan: dbPlan });

      return NextResponse.json({ ok: true, plan: normalizedPlan });
    }

    if (action === "extend_trial") {
      const restRes = await db.query(
        "SELECT subscription_status, trial_ends_at, current_period_end FROM restaurants WHERE id = $1",
        [id]
      );
      if (restRes.rows.length === 0) {
        return NextResponse.json({ error: "restaurant not found" }, { status: 404 });
      }

      const row = restRes.rows[0];
      const isTrialing = row.subscription_status === "trialing" || row.subscription_status === "trial";
      
      let columnToUpdate = "current_period_end";
      let baseDate = row.current_period_end ? new Date(row.current_period_end) : new Date();

      if (isTrialing) {
        columnToUpdate = "trial_ends_at";
        baseDate = row.trial_ends_at ? new Date(row.trial_ends_at) : new Date();
      }

      // Add 7 days
      const newDate = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      await db.query(
        `UPDATE restaurants SET ${columnToUpdate} = $1, billing_updated_at = NOW() WHERE id = $2`,
        [newDate, id]
      );

      // Audit Log
      await logAuditEvent(actor, "GRANT_TRIAL_EXTENSION", id, "restaurant", {
        extendedField: columnToUpdate,
        newExpiry: newDate.toISOString()
      });

      return NextResponse.json({ ok: true, newExpiry: newDate.toISOString() });
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (err) {
    console.error("billing update error:", err);
    return NextResponse.json({ error: "failed to update billing settings" }, { status: 500 });
  }
}
