import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { updateStaffFeedback } from "@/lib/superadmin/queries";
import { recordAuditLog } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;
  
  try {
    await db.query(`
      ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_response TEXT;
      ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_responded_at TIMESTAMP;
      ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_responded_by TEXT;
    `);

    const { id } = await params;
    const body = await request.json();
    const { status, response } = body;

    if (!status) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }

    const actor = (await requireSessionEmail()) || "qadmin";
    await updateStaffFeedback(id, status, response || "", actor);

    let ticketTitle = id;
    try {
      const fRes = await db.query("SELECT title FROM staff_feedback WHERE id = $1", [id]);
      if (fRes.rows[0]?.title) ticketTitle = fRes.rows[0].title;
    } catch {}

    await recordAuditLog({
      action: "FEEDBACK_RESPONSE",
      entityType: "feedback",
      entityId: id,
      entityName: ticketTitle,
      details: {
        status,
        response_note: response || "",
      },
      actorUsername: actor,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("update feedback error:", err);
    return NextResponse.json({ error: "failed to update feedback" }, { status: 500 });
  }
}
