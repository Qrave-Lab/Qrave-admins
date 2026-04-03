import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listFeedback } from "@/lib/superadmin/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const data = await listFeedback(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("feedback error:", err);
    return NextResponse.json({ error: "failed to list feedback" }, { status: 500 });
  }
}
