import { NextResponse } from "next/server";
import { requireAuthJson, requireSessionEmail } from "@/lib/auth/server";
import { setRestaurantUserStatus } from "@/lib/superadmin/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const { id, userId } = await params;
    const body = await request.json();
    const status = (body.status || "").toLowerCase().trim();
    const reason = (body.reason || "").trim();
    const validStatuses = ["active", "disabled", "revoked"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    const actor = (await requireSessionEmail()) || "superadmin";
    const result = await setRestaurantUserStatus(id, userId, status, reason, actor);
    if (result === null) {
      return NextResponse.json({ error: "user/restaurant not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("set user status error:", err);
    return NextResponse.json({ error: "failed to update user status" }, { status: 500 });
  }
}
