import { NextResponse } from "next/server";
import { getSessionForMfaSetup } from "@/lib/auth/server";
import { regenerateRecoveryCodes } from "@/lib/auth/mfa";
import { loginBlocked, mfaThrottleKeys, recordLoginFailure } from "@/lib/auth/throttle";
import { clientIP } from "@/lib/auth/ip";

/** Replaces all recovery codes (needs a current code from the app). */
export async function POST(request: Request) {
  const session = await getSessionForMfaSetup();
  if (!session || session.mfa !== "ok") return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const keys = mfaThrottleKeys(session.id, clientIP(request));
  const blockedFor = await loginBlocked(keys);
  if (blockedFor > 0) {
    return NextResponse.json({ error: `Too many wrong codes. Try again in ${Math.ceil(blockedFor / 60)} min.` }, { status: 429 });
  }

  try {
    const codes = await regenerateRecoveryCodes(session.id, String(body.code || ""));
    if (!codes) {
      await recordLoginFailure(keys);
      return NextResponse.json({ error: "That code didn't work. Use a code from your app (not a recovery code)." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, recovery_codes: codes }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    console.error("2FA recovery codes error:", err);
    return NextResponse.json({ error: "Could not make new recovery codes" }, { status: 500 });
  }
}
