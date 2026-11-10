import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateSuperadminCredentials } from "@/lib/auth/credentials";
import {
  MFA_CHALLENGE_COOKIE,
  MFA_CHALLENGE_TTL_SECONDS,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SessionSecretMissingError,
  cookieOptions,
  signMfaChallenge,
  signSession,
} from "@/lib/auth/session";
import { getMfaStatus } from "@/lib/auth/mfa";
import { clientIP } from "@/lib/auth/ip";
import { twoFactorRequired } from "@/lib/auth/totp";
import { loginBlocked, recordLoginFailure, clearLoginFailures, throttleKeys } from "@/lib/auth/throttle";

type LocalAuthResult = {
  available: boolean;
  ok: boolean;
  id?: string;
  username?: string;
};

async function authenticateAgainstLocalDB(username: string, password: string): Promise<LocalAuthResult> {
  try {
    const { rows } = await db.query(
      "SELECT id, username, password FROM superadmin_users WHERE lower(username) = $1",
      [username.toLowerCase()],
    );
    if (rows.length === 0) {
      return { available: true, ok: false };
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { available: true, ok: false };
    }
    return { available: true, ok: true, id: String(user.id), username: String(user.username) };
  } catch (err) {
    console.error("Local qadmin auth error:", err);
    return { available: false, ok: false };
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const keys = throttleKeys(username, clientIP(request));
    const blockedFor = await loginBlocked(keys);
    if (blockedFor > 0) {
      return NextResponse.json(
        { error: `Too many failed attempts. Try again in ${Math.ceil(blockedFor / 60)} min.` },
        { status: 429 },
      );
    }

    const local = await authenticateAgainstLocalDB(username, password);
    let sessionID: string;
    let sessionUsername: string;
    if (local.ok && local.id && local.username) {
      sessionID = local.id;
      sessionUsername = local.username;
    } else if (await validateSuperadminCredentials(username, password)) {
      sessionID = `bootstrap:${username}`;
      sessionUsername = username;
    } else {
      await recordLoginFailure(keys);
      const message = local.available
        ? "Invalid credentials"
        : "QAdmin store unavailable and no matching bootstrap admin was found";
      return NextResponse.json({ error: message }, { status: local.available ? 401 : 503 });
    }

    // Password is right. Next: a code from the authenticator app, or 2FA setup.
    let mfaEnabled = false;
    try {
      mfaEnabled = (await getMfaStatus(sessionID)).enabled;
    } catch (err) {
      console.error("2FA status lookup failed:", err);
      if (twoFactorRequired()) {
        return NextResponse.json({ error: "Two-step sign-in is unavailable right now. Try again shortly." }, { status: 503 });
      }
    }

    try {
      if (mfaEnabled) {
        const challenge = await signMfaChallenge(sessionID, sessionUsername);
        const res = NextResponse.json({ ok: true, mfa_required: true });
        res.cookies.set(MFA_CHALLENGE_COOKIE, challenge, cookieOptions(MFA_CHALLENGE_TTL_SECONDS));
        return res;
      }

      const setupRequired = twoFactorRequired();
      const token = await signSession(sessionID, sessionUsername, setupRequired ? "setup" : "ok");
      await clearLoginFailures(username);
      const res = NextResponse.json({ ok: true, setup_required: setupRequired });
      res.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_SECONDS));
      return res;
    } catch (err) {
      if (err instanceof SessionSecretMissingError) {
        console.error(err.message);
        return NextResponse.json(
          { error: "Sign-in is not configured on this server (SUPERADMIN_SESSION_SECRET missing)." },
          { status: 503 },
        );
      }
      throw err;
    }
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
