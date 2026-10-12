import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json();
    const actor = (await requireSessionEmail()) || "superadmin";

    // Fetch existing
    const existingRes = await db.query(
      "SELECT * FROM platform_broadcast_banners WHERE id = $1",
      [id],
    );
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Broadcast banner not found" }, { status: 404 });
    }
    const current = existingRes.rows[0];

    const isActive = typeof body.isActive === "boolean" ? body.isActive : current.is_active;
    const message = body.message !== undefined ? String(body.message).trim() : current.message;
    const title = body.title !== undefined ? String(body.title).trim() : current.title;
    const severity = body.severity || current.severity;

    const updateRes = await db.query(
      `
      UPDATE platform_broadcast_banners
      SET is_active = $1, message = $2, title = $3, severity = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
      `,
      [isActive, message, title, severity, id],
    );

    const updated = updateRes.rows[0];

    await recordAuditLog({
      action: "BROADCAST_UPDATE",
      entityType: "broadcast",
      entityId: id,
      entityName: updated.title,
      details: {
        previous_active: current.is_active,
        new_active: updated.is_active,
        severity: updated.severity,
      },
      actorUsername: actor,
    });

    return NextResponse.json({ success: true, broadcast: updated });
  } catch (err: any) {
    console.error("PATCH broadcast error:", err);
    return NextResponse.json({ error: "Failed to update broadcast" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const actor = (await requireSessionEmail()) || "superadmin";

    const existingRes = await db.query(
      "SELECT title FROM platform_broadcast_banners WHERE id = $1",
      [id],
    );
    const title = existingRes.rows[0]?.title || id;

    await db.query("DELETE FROM platform_broadcast_banners WHERE id = $1", [id]);

    await recordAuditLog({
      action: "BROADCAST_DELETE",
      entityType: "broadcast",
      entityId: id,
      entityName: title,
      details: {},
      actorUsername: actor,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE broadcast error:", err);
    return NextResponse.json({ error: "Failed to delete broadcast" }, { status: 500 });
  }
}
