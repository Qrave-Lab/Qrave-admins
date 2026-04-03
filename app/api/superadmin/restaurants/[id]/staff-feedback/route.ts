import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listStaffFeedback } from "@/lib/superadmin/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const data = await listStaffFeedback(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("staff feedback error:", err);
    return NextResponse.json({ error: "failed to list staff feedback" }, { status: 500 });
  }
}
