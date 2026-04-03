import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listRestaurantUsers } from "@/lib/superadmin/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const data = await listRestaurantUsers(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("restaurant users error:", err);
    return NextResponse.json({ error: "failed to list users" }, { status: 500 });
  }
}
