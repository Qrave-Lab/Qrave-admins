import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const unauthorized = await requireAuthJson();
    if (unauthorized) return unauthorized;

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
        return NextResponse.json({ error: 'Restaurant ID required' }, { status: 400 });
    }

    try {
        // Join restaurant_users and users to get staff details
        const query = `
            SELECT u.id, u.name, u.email, u.phone, ru.role, ru.restaurant_id
            FROM restaurant_users ru
            JOIN users u ON ru.user_id = u.id
            WHERE ru.restaurant_id = $1
        `;
        const result = await db.query(query, [restaurantId]);
        return NextResponse.json(result.rows);
    } catch (e) {
        console.error("Failed to fetch staff:", e);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
    }
}
