import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { jwtVerify } from "jose";

export const SESSION_COOKIE = "qrave_sa_session";
const secretKey = new TextEncoder().encode(process.env.SUPERADMIN_API_KEY || "superadmin-secret-dev-key");

type SessionUser = {
  id: string;
  username: string;
};

async function decodeSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const id = payload.id as string;
    const username = payload.username as string;
    if (!id || !username) return null;
    return { id, username };
  } catch {
    return null;
  }
}

export async function requireAuthJson(): Promise<NextResponse | null> {
  const session = await decodeSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requireAuthPage(): Promise<SessionUser> {
  const session = await decodeSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireSessionEmail(): Promise<string | null> {
  const session = await decodeSession();
  return session?.username || null;
}
