import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateSuperadminCredentials } from "@/lib/auth/credentials";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, SessionSecretMissingError, signSession } from "@/lib/auth/session";
import { loginBlocked, recordLoginFailure, clearLoginFailures } from "@/lib/auth/throttle";

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

function clientIP(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : request.headers.get("x-real-ip") || "unknown").trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const throttleKey = `${clientIP(request)}|${username}`;
    const blockedFor = loginBlocked(throttleKey);
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
    } else if (validateSuperadminCredentials(username, password)) {
      sessionID = `bootstrap:${username}`;
      sessionUsername = username;
    } else {
      recordLoginFailure(throttleKey);
      const message = local.available
        ? "Invalid credentials"
        : "QAdmin store unavailable and no matching bootstrap admin was found";
      return NextResponse.json({ error: message }, { status: local.available ? 401 : 503 });
    }

    let token: string;
    try {
      token = await signSession(sessionID, sessionUsername);
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

    clearLoginFailures(throttleKey);
    const res = NextResponse.json({ ok: true, message: "Logged in successfully" });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
