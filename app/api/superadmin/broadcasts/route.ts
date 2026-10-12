import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { recordAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    let query = `
      SELECT 
        b.id,
        b.title,
        b.message,
        b.severity,
        b.scope,
        b.restaurant_id,
        r.name as restaurant_name,
        b.target_audience,
        b.is_active,
        b.starts_at,
        b.expires_at,
        b.created_by,
        b.created_at,
        b.updated_at
      FROM platform_broadcast_banners b
      LEFT JOIN restaurants r ON b.restaurant_id = r.id
    `;

    if (activeOnly) {
      query += ` WHERE b.is_active = true AND (b.expires_at IS NULL OR b.expires_at > NOW())`;
    }

    query += ` ORDER BY b.is_active DESC, b.starts_at DESC`;

    const { rows } = await db.query(query);
    return NextResponse.json({ broadcasts: rows });
  } catch (err: any) {
    console.error("GET broadcasts error:", err);
    return NextResponse.json({ error: "Failed to fetch broadcasts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const {
      title,
      message,
      severity = "warning",
      scope = "global",
      restaurantId = null,
      targetAudience = "all",
      expiresInHours = null,
    } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
    }

    const actor = (await requireSessionEmail()) || "superadmin";

    let expiresAt: Date | null = null;
    if (expiresInHours && Number(expiresInHours) > 0) {
      expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);
    }

    const insertQuery = `
      INSERT INTO platform_broadcast_banners (
        title, message, severity, scope, restaurant_id, target_audience, is_active, starts_at, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), $7, $8)
      RETURNING *
    `;

    const { rows } = await db.query(insertQuery, [
      title.trim(),
      message.trim(),
      severity,
      scope,
      restaurantId || null,
      targetAudience,
      expiresAt,
      actor,
    ]);

    const created = rows[0];

    // Log to Audit Trail
    await recordAuditLog({
      action: "BROADCAST_CREATE",
      entityType: "broadcast",
      entityId: created.id,
      entityName: created.title,
      details: {
        severity: created.severity,
        scope: created.scope,
        restaurant_id: created.restaurant_id,
        target_audience: created.target_audience,
        expires_at: created.expires_at,
      },
      actorUsername: actor,
    });

    return NextResponse.json({ success: true, broadcast: created }, { status: 201 });
  } catch (err: any) {
    console.error("POST broadcast error:", err);
    return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 });
  }
}
