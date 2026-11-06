import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listContactRequests } from "@/lib/superadmin/queries";

export async function GET(request: Request) {
    const unauthorized = await requireAuthJson();
    if (unauthorized) return unauthorized;

    try {
        const limit = parseInt(new URL(request.url).searchParams.get("limit") || "500", 10) || 500;
        return NextResponse.json(await listContactRequests(Math.min(limit, 1000)));
    } catch (err) {
        console.error("contact-requests error:", err);
        return NextResponse.json({ error: "failed to load contact requests" }, { status: 500 });
    }
}
