import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { setGlobalDiscountStatus } from "@/lib/superadmin/queries";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const { id } = await params;
    await setGlobalDiscountStatus(id, Boolean(body?.isActive));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("global discount status error:", err);
    return NextResponse.json({ error: "failed to update status" }, { status: 500 });
  }
}

