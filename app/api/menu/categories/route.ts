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
        const result = await db.query(
            "SELECT * FROM menu_categories WHERE restaurant_id = $1 ORDER BY name", 
            [restaurantId]
        );
        return NextResponse.json(result.rows);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}
