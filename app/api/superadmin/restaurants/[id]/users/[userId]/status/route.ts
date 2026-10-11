import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { setRestaurantUserStatus } from "@/lib/superadmin/queries";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id, userId } = await params;
    const body = await request.json();
    const status = (body.status || "").toLowerCase().trim();
    const reason = (body.reason || "").trim();
    const validStatuses = ["active", "disabled", "revoked"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const actor = (await requireSessionEmail()) || "superadmin";
    const result = await setRestaurantUserStatus(id, userId, status, reason, actor);
    if (result === null) {
      return NextResponse.json({ error: "user/restaurant not found" }, { status: 404 });
    }

    let userName = userId;
    try {
      const uRes = await db.query("SELECT name, email FROM users WHERE id = $1", [userId]);
      if (uRes.rows[0]) {
        userName = uRes.rows[0].name || uRes.rows[0].email || userId;
      }
    } catch {}

    await recordAuditLog({
      action: "USER_STATUS_CHANGE",
      entityType: "user",
      entityId: userId,
      entityName: userName,
      details: {
        restaurant_id: id,
        new_status: status,
        reason: reason || null,
      },
      actorUsername: actor,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("set user status error:", err);
    return NextResponse.json({ error: "failed to update user status" }, { status: 500 });
  }
}
