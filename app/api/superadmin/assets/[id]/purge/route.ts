import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/superadmin/audit";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const actor = (await requireSessionEmail()) || "superadmin";

    // Retrieve item name and restaurant ID for audit logging metadata
    const itemRes = await db.query(
      `SELECT mi.name, mi.restaurant_id FROM menu_items mi WHERE mi.id = $1`,
      [id]
    );

    if (itemRes.rows.length === 0) {
      return NextResponse.json({ error: "item not found" }, { status: 404 });
    }

    const { name, restaurant_id } = itemRes.rows[0];

    // Purge the 3D model reference
    await db.query(
      `UPDATE menu_items SET model_glb = NULL WHERE id = $1`,
      [id]
    );

    // Audit Log
    await logAuditEvent(actor, "PURGE_3D_ASSET", id, "menu_item", {
      itemName: name,
      restaurantId: restaurant_id
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("purge asset error:", err);
    return NextResponse.json({ error: "failed to purge asset" }, { status: 500 });
  }
}
