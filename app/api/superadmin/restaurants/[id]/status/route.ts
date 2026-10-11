import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { setRestaurantStatus } from "@/lib/superadmin/queries";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

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

    // Fetch restaurant name for human-readable audit
    let restName = id;
    try {
      const rRes = await db.query("SELECT name FROM restaurants WHERE id = $1", [id]);
      if (rRes.rows[0]?.name) restName = rRes.rows[0].name;
    } catch {}

    await setRestaurantStatus(id, status, reason, actor);

    await recordAuditLog({
      action: "RESTAURANT_STATUS_CHANGE",
      entityType: "restaurant",
      entityId: id,
      entityName: restName,
      details: {
        new_status: status,
        reason: reason || null,
      },
      actorUsername: actor,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("set status error:", err);
    return NextResponse.json({ error: "failed to update status" }, { status: 500 });
  }
}
