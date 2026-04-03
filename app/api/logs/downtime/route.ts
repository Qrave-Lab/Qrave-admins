import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const unauthorized = await requireAuthJson();
    if (unauthorized) return unauthorized;

    try {
        const downtime = await db.query(`
            SELECT de.*, r.name as restaurant_name
            FROM restaurant_downtime_events de
            LEFT JOIN restaurants r ON de.restaurant_id = r.id
            ORDER BY created_at DESC
        `);
        return NextResponse.json(downtime.rows);
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
