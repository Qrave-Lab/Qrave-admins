import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { listPlatformOperations } from "@/lib/superadmin/queries";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const data = await listPlatformOperations();
    return NextResponse.json(data);
  } catch (err) {
    console.error("operations error:", err);
    return NextResponse.json({ error: "failed to load operations" }, { status: 500 });
  }
}
