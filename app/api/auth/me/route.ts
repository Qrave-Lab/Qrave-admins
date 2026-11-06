import { NextResponse } from "next/server";
import { sessionPermissions } from "@/lib/auth/server";

/** The signed-in admin, their role and what they may do. Used to hide actions in the UI. */
export async function GET() {
  const me = await sessionPermissions();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(
    {
      id: me.user.id,
      username: me.user.username,
      name: me.user.name,
      role: me.user.role,
      permissions: me.permissions,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
