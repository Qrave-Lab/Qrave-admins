import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listDowntimes } from "@/lib/superadmin/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const data = await listDowntimes(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("downtimes error:", err);
    return NextResponse.json({ error: "failed to list downtimes" }, { status: 500 });
  }
}
