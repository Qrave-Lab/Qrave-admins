import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
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
