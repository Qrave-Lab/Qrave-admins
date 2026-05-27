import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { logAuditEvent } from "@/lib/superadmin/audit";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { rows } = await db.query(`
      SELECT id, title, message, severity, is_active AS "isActive",
             created_by AS "createdBy",
             to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt",
             to_char(resolved_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "resolvedAt"
      FROM superadmin_incident_broadcasts
      ORDER BY created_at DESC
      LIMIT 100
    `);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("fetch incidents error:", err);
    return NextResponse.json({ error: "failed to fetch incidents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { title, message, severity } = body;
    const actor = (await requireSessionEmail()) || "superadmin";

    if (!title || !message) {
      return NextResponse.json({ error: "title and message are required" }, { status: 400 });
    }

    const { rows } = await db.query(
      `INSERT INTO superadmin_incident_broadcasts (title, message, severity, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, message, severity, is_active AS "isActive", created_by AS "createdBy", created_at AS "createdAt"`,
      [title, message, severity || "info", actor]
    );

    // Audit Log
    await logAuditEvent(actor, "CREATE_INCIDENT_BROADCAST", rows[0].id, "incident", { title, severity });

    return NextResponse.json(rows[0], { status: 201 });
  } catch (err) {
    console.error("create incident error:", err);
    return NextResponse.json({ error: "failed to create incident" }, { status: 500 });
  }
}
