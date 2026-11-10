import { NextResponse } from "next/server";
import { getSessionForMfaSetup } from "@/lib/auth/server";
import { confirmSetup, isBootstrapId } from "@/lib/auth/mfa";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, cookieOptions, signSession } from "@/lib/auth/session";
import { loginBlocked, mfaThrottleKeys, recordLoginFailure } from "@/lib/auth/throttle";
import { clientIP } from "@/lib/auth/ip";

/** Finishes setup with a code from the app; returns one-time recovery codes. */
export async function POST(request: Request) {
  const session = await getSessionForMfaSetup();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (isBootstrapId(session.id)) {
    return NextResponse.json({ error: "Env admins are set up by adding totp_secret to SUPERADMIN_USERS_JSON." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim();
  const keys = mfaThrottleKeys(session.id, clientIP(request));
  const blockedFor = await loginBlocked(keys);
  if (blockedFor > 0) {
    return NextResponse.json({ error: `Too many wrong codes. Try again in ${Math.ceil(blockedFor / 60)} min.` }, { status: 429 });
  }

  try {
    const codes = await confirmSetup(session.id, code);
    if (!codes) {
      await recordLoginFailure(keys);
      return NextResponse.json({ error: "That code didn't work. Enter the current 6-digit code from your app." }, { status: 400 });
    }
    const token = await signSession(session.id, session.username, "ok");
    const res = NextResponse.json({ ok: true, recovery_codes: codes }, { headers: { "cache-control": "no-store" } });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
    return res;
  } catch (err) {
    console.error("2FA confirm error:", err);
    return NextResponse.json({ error: "Could not finish 2FA setup" }, { status: 500 });
  }
}
