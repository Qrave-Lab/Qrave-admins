import { NextResponse } from "next/server";
import { MFA_CHALLENGE_COOKIE, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  res.cookies.delete(MFA_CHALLENGE_COOKIE);
  return res;
}
