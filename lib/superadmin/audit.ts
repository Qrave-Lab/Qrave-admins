import { db } from "@/lib/db";

export async function logAuditEvent(
  actorEmail: string,
  action: string,
  targetId: string | null = null,
  targetType: string | null = null,
  metadata: any = {}
) {
  try {
    await db.query(
      `INSERT INTO superadmin_audit_logs (actor_email, action, target_id, target_type, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorEmail, action, targetId, targetType, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}
