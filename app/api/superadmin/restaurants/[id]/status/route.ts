import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { setRestaurantStatus } from "@/lib/superadmin/queries";
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
    const status = (body.status || "").toLowerCase().trim();
    const reason = (body.reason || "").trim();
    const validStatuses = ["active", "trial", "churn-risk", "disabled", "revoked"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const actor = (await requireSessionEmail()) || "superadmin";
    await setRestaurantStatus(id, status, reason, actor);
    
    // Log audit event
    await logAuditEvent(actor, "UPDATE_RESTAURANT_STATUS", id, "restaurant", { status, reason });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("set status error:", err);
    return NextResponse.json({ error: "failed to update status" }, { status: 500 });
  }
}
