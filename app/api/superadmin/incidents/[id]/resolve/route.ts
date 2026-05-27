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
    const actor = (await requireSessionEmail()) || "superadmin";

    const { rowCount } = await db.query(
      `UPDATE superadmin_incident_broadcasts
       SET is_active = FALSE, resolved_at = NOW()
       WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: "incident not found or already resolved" }, { status: 404 });
    }

    // Audit Log
    await logAuditEvent(actor, "RESOLVE_INCIDENT_BROADCAST", id, "incident");

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("resolve incident error:", err);
    return NextResponse.json({ error: "failed to resolve incident" }, { status: 500 });
  }
}
