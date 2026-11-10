import { NextResponse } from "next/server";
import { getSessionForMfaSetup } from "@/lib/auth/server";
import { disableMfa, isBootstrapId } from "@/lib/auth/mfa";
import { twoFactorRequired } from "@/lib/auth/totp";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, cookieOptions, signSession } from "@/lib/auth/session";
import { loginBlocked, mfaThrottleKeys, recordLoginFailure } from "@/lib/auth/throttle";
import { clientIP } from "@/lib/auth/ip";

/**
 * Turns 2FA off (needs a current code). When 2FA is required, the admin is
 * sent straight back to setup, so this works as "move to a new phone".
 */
export async function POST(request: Request) {
  const session = await getSessionForMfaSetup();
  if (!session || session.mfa !== "ok") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (isBootstrapId(session.id)) {
    return NextResponse.json({ error: "Env admins change 2FA in SUPERADMIN_USERS_JSON." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const keys = mfaThrottleKeys(session.id, clientIP(request));
  const blockedFor = await loginBlocked(keys);
  if (blockedFor > 0) {
    return NextResponse.json({ error: `Too many wrong codes. Try again in ${Math.ceil(blockedFor / 60)} min.` }, { status: 429 });
  }

  try {
    if (!(await disableMfa(session.id, String(body.code || "")))) {
      await recordLoginFailure(keys);
      return NextResponse.json({ error: "That code didn't work." }, { status: 400 });
    }
    const required = twoFactorRequired();
    const token = await signSession(session.id, session.username, required ? "setup" : "ok");
    const res = NextResponse.json({ ok: true, setup_required: required });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
    return res;
  } catch (err) {
    console.error("2FA disable error:", err);
    return NextResponse.json({ error: "Could not turn off 2FA" }, { status: 500 });
  }
}
