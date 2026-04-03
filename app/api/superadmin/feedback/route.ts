import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listGlobalFeedback } from "@/lib/superadmin/queries";

export async function GET(request: Request) {
    const unauthorized = await requireAuthJson();
    if (unauthorized) return unauthorized;

    try {
        const url = new URL(request.url);
        const limitParams = url.searchParams.get("limit");
        const limit = parseInt(limitParams || "200", 10);
        const feedback = await listGlobalFeedback(limit);
        return NextResponse.json(feedback);
    } catch (err) {
        console.error("feedback error:", err);
        return NextResponse.json({ error: "failed to load feedback" }, { status: 500 });
    }
}
