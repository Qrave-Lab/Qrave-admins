import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { requirePermissionJson } from "@/lib/auth/server";

// One-off schema fix. Super Admin only.
export async function GET() {
    const forbidden = await requirePermissionJson("qadmins.manage");
    if (forbidden) return forbidden;
    try {
        await db.query(`
            ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_response TEXT;
            ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_responded_at TIMESTAMP;
            ALTER TABLE staff_feedback ADD COLUMN IF NOT EXISTS admin_responded_by TEXT;
        `);
        return NextResponse.json({ success: true, message: "Migration applied successfully" });
    } catch (error) {
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
