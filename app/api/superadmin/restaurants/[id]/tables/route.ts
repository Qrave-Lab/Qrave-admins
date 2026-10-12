import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id: restaurantId } = await params;
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get("baseUrl") || process.env.NEXT_PUBLIC_DINER_APP_URL || "https://order.qrave.in";

    const { rows: restRows } = await db.query(
      "SELECT id, name, currency FROM restaurants WHERE id = $1",
      [restaurantId],
    );

    if (restRows.length === 0) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurant = restRows[0];

    const { rows: tables } = await db.query(
      `
      SELECT 
        id,
        restaurant_id,
        table_number,
        floor_name,
        counter_name,
        capacity,
        is_enabled,
        created_at
      FROM restaurant_tables
      WHERE restaurant_id = $1 AND (is_archived IS NULL OR is_archived = false)
      ORDER BY table_number ASC
      `,
      [restaurantId],
    );

    const enriched = tables.map((t: any) => ({
      ...t,
      qrUrl: `${baseUrl.replace(/\/$/, "")}/r/${restaurantId}/t/${t.table_number}`,
    }));

    return NextResponse.json({
      restaurant,
      tables: enriched,
      totalCount: enriched.length,
    });
  } catch (err: any) {
    console.error("GET tables error:", err);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id: restaurantId } = await params;
    const body = await request.json();
    const actor = (await requireSessionEmail()) || "superadmin";

    const count = Math.min(Math.max(Number(body.count) || 5, 1), 100);
    const floorName = body.floorName?.trim() || "Main Dining";
    const capacity = Number(body.capacity) || 4;

    // Find highest table number currently
    const maxRes = await db.query(
      "SELECT COALESCE(MAX(table_number), 0) as max_table FROM restaurant_tables WHERE restaurant_id = $1",
      [restaurantId],
    );
    const startTable = (maxRes.rows[0]?.max_table || 0) + 1;
    const endTable = startTable + count - 1;

    await db.query(
      `
      INSERT INTO restaurant_tables (restaurant_id, table_number, floor_name, capacity, is_enabled)
      SELECT $1, gs, $2, $3, true
      FROM generate_series($4, $5) AS gs
      `,
      [restaurantId, floorName, capacity, startTable, endTable],
    );

    await recordAuditLog({
      action: "RESTAURANT_CREATE",
      entityType: "restaurant",
      entityId: restaurantId,
      entityName: `Tables ${startTable}-${endTable} added`,
      details: { addedCount: count, startTable, endTable, floorName },
      actorUsername: actor,
    });

    return NextResponse.json({
      success: true,
      message: `Added tables ${startTable} to ${endTable}`,
      startTable,
      endTable,
      count,
    });
  } catch (err: any) {
    console.error("POST batch tables error:", err);
    return NextResponse.json({ error: "Failed to add tables" }, { status: 500 });
  }
}
