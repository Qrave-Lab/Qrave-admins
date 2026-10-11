import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/server";
import { NextResponse } from "next/server";
import { evaluateTicketSla, computeSlaSummary } from "@/lib/sla";

export async function GET(request: Request) {
    const unauthorized = await requireAuthJson();
    if (unauthorized) return unauthorized;

    try {
        await db.query(`
            ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_response TEXT;
            ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_responded_at TIMESTAMP;
            ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_responded_by TEXT;
            ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;
        `);

        const feedback = await db.query(`
            SELECT 
                sf.id,
                sf.type,
                sf.priority,
                sf.title,
                sf.description,
                sf.status,
                sf.created_at,
                sf.resolved_at,
                sf.user_role,
                COALESCE(sf.admin_response, '') AS admin_response,
                sf.admin_responded_at,
                COALESCE(sf.admin_responded_by, '') AS admin_responded_by,
                r.name as restaurant_name, 
                u.name as user_name
            FROM staff_feedback sf
            LEFT JOIN restaurants r ON sf.restaurant_id = r.id
            LEFT JOIN users u ON sf.user_id = u.id
            ORDER BY sf.created_at DESC
        `);

        const enriched = feedback.rows.map((row: any) => ({
            ...row,
            sla: evaluateTicketSla(row),
        }));

        const metrics = computeSlaSummary(feedback.rows);

        return NextResponse.json({
            tickets: enriched,
            metrics,
        });
    } catch (e) {
        console.error("Feedback route error:", e);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
