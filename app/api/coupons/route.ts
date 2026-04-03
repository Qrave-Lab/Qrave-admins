import { db } from "@/lib/db";
import { requireAuthJson } from "@/lib/auth/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const unauthorized = await requireAuthJson();
    if (unauthorized) return unauthorized;

    try {
        const query = `
            SELECT 
                oc.id, oc.name, oc.code, oc.discount_value, oc.is_active, r.name as restaurant_name,
                (SELECT COUNT(*) FROM offer_coupon_redemptions ocr WHERE ocr.campaign_id = oc.id) as redemption_count
            FROM offer_campaigns oc
            LEFT JOIN restaurants r ON oc.restaurant_id = r.id
            ORDER BY oc.created_at DESC
        `;
        const result = await db.query(query);
        return NextResponse.json(result.rows);
    } catch (e) {
        console.error("Failed to fetch coupons:", e);
        return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
    }
}
