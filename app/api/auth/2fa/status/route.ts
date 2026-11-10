import { NextResponse } from "next/server";
import { getSessionForMfaSetup } from "@/lib/auth/server";
import { getMfaStatus } from "@/lib/auth/mfa";
import { twoFactorRequired } from "@/lib/auth/totp";

export async function GET() {
  const session = await getSessionForMfaSetup();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const status = await getMfaStatus(session.id);
    return NextResponse.json(
      { ...status, required: twoFactorRequired(), setup_pending: session.mfa === "setup", username: session.username },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("2FA status error:", err);
    return NextResponse.json({ error: "Could not load 2FA status" }, { status: 500 });
  }
}
