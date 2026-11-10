import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  MFA_CHALLENGE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  cookieOptions,
  signSession,
  verifyMfaChallenge,
} from "@/lib/auth/session";
import { getMfaStatus, verifySecondFactor } from "@/lib/auth/mfa";
import { clearLoginFailures, loginBlocked, mfaThrottleKeys, recordLoginFailure } from "@/lib/auth/throttle";
import { clientIP } from "@/lib/auth/ip";

/** Second sign-in step: the code from the authenticator app, or a recovery code. */
export async function POST(request: Request) {
  const store = await cookies();
  const challenge = await verifyMfaChallenge(store.get(MFA_CHALLENGE_COOKIE)?.value);
  if (!challenge) {
    return NextResponse.json({ error: "Sign-in timed out. Enter your password again." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const code = String(body.code || "").trim();
  if (!code) return NextResponse.json({ error: "Enter the code from your app." }, { status: 400 });

  const keys = mfaThrottleKeys(challenge.id, clientIP(request));
  const blockedFor = await loginBlocked(keys);
  if (blockedFor > 0) {
    return NextResponse.json(
      { error: `Too many wrong codes. Try again in ${Math.ceil(blockedFor / 60)} min.` },
      { status: 429 },
    );
  }

  try {
    const how = await verifySecondFactor(challenge.id, code);
    if (!how) {
      await recordLoginFailure(keys);
      return NextResponse.json({ error: "That code didn't work. Check the time on your phone and try a new code." }, { status: 401 });
    }

    await clearLoginFailures(challenge.username, challenge.id);
    const token = await signSession(challenge.id, challenge.username, "ok");
    const left = how === "recovery" ? (await getMfaStatus(challenge.id)).recoveryCodesLeft : undefined;
    const res = NextResponse.json({ ok: true, used_recovery_code: how === "recovery", recovery_codes_left: left });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
    res.cookies.delete(MFA_CHALLENGE_COOKIE);
    return res;
  } catch (err) {
    console.error("2FA verify error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
