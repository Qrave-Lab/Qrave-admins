import { db } from "@/lib/db";
import { decodeSession } from "@/lib/auth/server";

export type AuditAction =
  | "RESTAURANT_STATUS_CHANGE"
  | "RESTAURANT_DELETE"
  | "RESTAURANT_CREATE"
  | "USER_STATUS_CHANGE"
  | "MENU_ITEM_CREATE"
  | "MENU_ITEM_UPDATE"
  | "MENU_ITEM_DELETE"
  | "DISCOUNT_CREATE"
  | "DISCOUNT_STATUS_CHANGE"
  | "COUPON_TOGGLE"
  | "STAFF_ADD"
  | "STAFF_UPDATE"
  | "QADMIN_CREATE"
  | "QADMIN_UPDATE"
  | "QADMIN_DELETE"
  | "FEEDBACK_RESPONSE"
  | "PLAN_AND_FEATURES_UPDATE"
  | "BROADCAST_CREATE"
  | "BROADCAST_UPDATE"
  | "BROADCAST_DELETE"
  | "RESTAURANT_WIZARD_ONBOARD";

export type AuditEntityType =
  | "restaurant"
  | "user"
  | "menu_item"
  | "discount"
  | "coupon"
  | "staff"
  | "qadmin"
  | "feedback"
  | "plan"
  | "broadcast";

export interface RecordAuditParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityName?: string | null;
  details?: Record<string, any>;
  actorUsername?: string | null;
  actorName?: string | null;
  actorId?: string | null;
  ipAddress?: string | null;
}

export interface AuditLogItem {
  id: string;
  qadminId: string | null;
  qadminUsername: string;
  qadminName: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  entityName: string | null;
  details: Record<string, any>;
  ipAddress: string | null;
  createdAt: string;
}

/**
 * Records an audit log event in the database.
 * Non-blocking: will never throw an exception to caller.
 */
export async function recordAuditLog(params: RecordAuditParams): Promise<void> {
  try {
    let username = params.actorUsername || "";
    let qadminId = params.actorId || null;
    let qadminName = params.actorName || null;

    // If actor is not explicitly passed, attempt resolution from session
    if (!username) {
      try {
        const session = await decodeSession();
        if (session) {
          username = session.username;
          qadminId = session.id;
        }
      } catch (sessionErr) {
        // Ignored, proceed with fallback
      }
    }

    if (!username) {
      username = "superadmin";
    }

    // Attempt to lookup actor's display name if not available
    if (!qadminName && username) {
      try {
        const { rows } = await db.query(
          "SELECT name FROM superadmin_users WHERE lower(username) = $1 LIMIT 1",
          [username.toLowerCase().trim()]
        );
        if (rows.length > 0 && rows[0].name) {
          qadminName = rows[0].name;
        }
      } catch {
        // Fallback to username
      }
    }

    if (!qadminName) {
      qadminName = username;
    }

    await db.query(
      `INSERT INTO superadmin_audit_logs 
        (qadmin_id, qadmin_username, qadmin_name, action, entity_type, entity_id, entity_name, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        qadminId,
        username,
        qadminName,
        params.action,
        params.entityType,
        params.entityId || null,
        params.entityName || null,
        JSON.stringify(params.details || {}),
        params.ipAddress || null,
      ]
    );
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
  }
}

export interface ListAuditLogsFilters {
  qadmin?: string;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listAuditLogs(filters: ListAuditLogsFilters = {}): Promise<{
  logs: AuditLogItem[];
  total: number;
}> {
  const limit = Math.min(Math.max(Number(filters.limit) || 50, 1), 200);
  const offset = Math.max(Number(filters.offset) || 0, 0);

  const conditions: string[] = [];
  const values: any[] = [];
  let valIdx = 1;

  if (filters.qadmin && filters.qadmin.trim() !== "") {
    conditions.push(`LOWER(qadmin_username) = $${valIdx}`);
    values.push(filters.qadmin.trim().toLowerCase());
    valIdx++;
  }

  if (filters.category && filters.category !== "all") {
    switch (filters.category) {
      case "restaurant_status":
        conditions.push(`action IN ('RESTAURANT_STATUS_CHANGE', 'RESTAURANT_DELETE', 'RESTAURANT_CREATE', 'USER_STATUS_CHANGE')`);
        break;
      case "menu":
        conditions.push(`action IN ('MENU_ITEM_CREATE', 'MENU_ITEM_UPDATE', 'MENU_ITEM_DELETE')`);
        break;
      case "discounts":
        conditions.push(`action IN ('DISCOUNT_CREATE', 'DISCOUNT_STATUS_CHANGE', 'COUPON_TOGGLE')`);
        break;
      case "staff":
        conditions.push(`action IN ('STAFF_ADD', 'STAFF_UPDATE')`);
        break;
      case "qadmins":
        conditions.push(`action IN ('QADMIN_CREATE', 'QADMIN_UPDATE', 'QADMIN_DELETE')`);
        break;
      case "support":
        conditions.push(`action IN ('FEEDBACK_RESPONSE')`);
        break;
      default:
        conditions.push(`entity_type = $${valIdx}`);
        values.push(filters.category);
        valIdx++;
        break;
    }
  }

  if (filters.search && filters.search.trim() !== "") {
    const q = `%${filters.search.trim()}%`;
    conditions.push(`(
      entity_name ILIKE $${valIdx} OR
      qadmin_username ILIKE $${valIdx} OR
      qadmin_name ILIKE $${valIdx} OR
      details::text ILIKE $${valIdx}
    )`);
    values.push(q);
    valIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count query
  const countRes = await db.query(
    `SELECT COUNT(1) AS total FROM superadmin_audit_logs ${whereClause}`,
    values
  );
  const total = Number(countRes.rows[0]?.total || 0);

  // Paginated records query
  const dataQuery = `
    SELECT
      id,
      qadmin_id,
      qadmin_username,
      qadmin_name,
      action,
      entity_type,
      entity_id,
      entity_name,
      details,
      ip_address,
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    FROM superadmin_audit_logs
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${valIdx} OFFSET $${valIdx + 1}
  `;

  const dataRes = await db.query(dataQuery, [...values, limit, offset]);

  const logs: AuditLogItem[] = dataRes.rows.map((row: any) => ({
    id: row.id,
    qadminId: row.qadmin_id,
    qadminUsername: row.qadmin_username,
    qadminName: row.qadmin_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    details: typeof row.details === "object" && row.details !== null ? row.details : {},
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  }));

  return { logs, total };
}

export async function getAuditStats(): Promise<{
  totalActions: number;
  todayActions: number;
  topQAdmin: string;
  categoryBreakdown: Record<string, number>;
}> {
  try {
    const totalRes = await db.query("SELECT COUNT(1) AS total FROM superadmin_audit_logs");
    const todayRes = await db.query(
      "SELECT COUNT(1) AS today FROM superadmin_audit_logs WHERE created_at >= CURRENT_DATE"
    );
    const topAdminRes = await db.query(`
      SELECT COALESCE(qadmin_name, qadmin_username) AS name, COUNT(1) AS count
      FROM superadmin_audit_logs
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 1
    `);
    const breakdownRes = await db.query(`
      SELECT entity_type, COUNT(1) AS count
      FROM superadmin_audit_logs
      GROUP BY entity_type
    `);

    const breakdown: Record<string, number> = {};
    for (const row of breakdownRes.rows) {
      breakdown[row.entity_type] = Number(row.count);
    }

    return {
      totalActions: Number(totalRes.rows[0]?.total || 0),
      todayActions: Number(todayRes.rows[0]?.today || 0),
      topQAdmin: topAdminRes.rows[0]?.name || "N/A",
      categoryBreakdown: breakdown,
    };
  } catch (err) {
    console.error("Failed to fetch audit stats:", err);
    return {
      totalActions: 0,
      todayActions: 0,
      topQAdmin: "N/A",
      categoryBreakdown: {},
    };
  }
}
