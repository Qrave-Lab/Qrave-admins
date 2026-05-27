import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { getRestaurantDetail } from "@/lib/superadmin/queries";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/superadmin/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const url = new URL(request.url);
    const range = url.searchParams.get("range") || "month";
    const data = await getRestaurantDetail(id, range);
    if (!data) {
      return NextResponse.json({ error: "restaurant not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("restaurant detail error:", err);
    return NextResponse.json({ error: "failed to load restaurant detail" }, { status: 500 });
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

    // Cascade delete
    await db.query("DELETE FROM restaurant_users WHERE restaurant_id = $1", [id]);
    await db.query("DELETE FROM menu_items WHERE restaurant_id = $1", [id]);
    await db.query("DELETE FROM menu_categories WHERE restaurant_id = $1", [id]);
    await db.query("DELETE FROM offer_campaigns WHERE restaurant_id = $1", [id]);
    
    await db.query("DELETE FROM restaurants WHERE id = $1", [id]);
    
    // Log audit event
    await logAuditEvent(actor, "DELETE_RESTAURANT", id, "restaurant");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("failed to delete restaurant", err);
    return NextResponse.json({ error: "failed to delete" }, { status: 500 });
  }
}
