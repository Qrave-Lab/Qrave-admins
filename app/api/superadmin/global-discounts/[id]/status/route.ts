import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { setGlobalDiscountStatus } from "@/lib/superadmin/queries";
import { recordAuditLog } from "@/lib/audit";
import { db } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { id } = await params;
    const isActive = Boolean(body?.isActive);
    await setGlobalDiscountStatus(id, isActive);

    let discName = id;
    try {
      const dRes = await db.query("SELECT name, code FROM global_discounts WHERE id = $1", [id]);
      if (dRes.rows[0]) {
        discName = dRes.rows[0].name || dRes.rows[0].code || id;
      }
    } catch {}

    await recordAuditLog({
      action: "DISCOUNT_STATUS_CHANGE",
      entityType: "discount",
      entityId: id,
      entityName: discName,
      details: {
        is_active: isActive,
        status: isActive ? "active" : "inactive",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("global discount status error:", err);
    return NextResponse.json({ error: "failed to update status" }, { status: 500 });
  }
}
