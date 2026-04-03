import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "qrave_sa_session";

type SessionUser = {
  id: string;
  username: string;
};

async function decodeSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [id, username] = decoded.split(":");
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
