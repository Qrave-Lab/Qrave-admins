import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const actionFilter = url.searchParams.get("action") || "";

    let query = `
      SELECT id, actor_email AS "actorEmail", action, target_id AS "targetId", 
             target_type AS "targetType", metadata, 
             to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
      FROM superadmin_audit_logs
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCounter = 1;

    if (search) {
      query += ` AND (lower(actor_email) LIKE $${paramCounter} OR lower(target_id) LIKE $${paramCounter})`;
      params.push(`%${search.toLowerCase()}%`);
      paramCounter++;
    }

    if (actionFilter) {
      query += ` AND action = $${paramCounter}`;
      params.push(actionFilter);
      paramCounter++;
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;

    const { rows } = await db.query(query, params);
    return NextResponse.json(rows);
  } catch (err) {
    console.error("fetch audit logs error:", err);
    return NextResponse.json({ error: "failed to fetch audit logs" }, { status: 500 });
  }
}
