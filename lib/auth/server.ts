import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QAdminRole, QAdminPermission, hasPermission, normalizeQAdminRole } from "@/lib/auth/roles";

export const SESSION_COOKIE = "qrave_sa_session";

export type SessionUser = {
  id: string;
  username: string;
};

export type FullSessionUser = {
  id: string;
  username: string;
  name: string;
  role: QAdminRole;
};

export async function decodeSession(): Promise<SessionUser | null> {
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

export async function getSessionUserWithRole(): Promise<FullSessionUser | null> {
  const session = await decodeSession();
  if (!session) return null;

  // Bootstrap account or superadmin default
  if (session.id.startsWith("bootstrap:") || session.username.toLowerCase() === "anandu") {
    return {
      id: session.id,
      username: session.username,
      name: session.username === "anandu" ? "Anantha Krishnan" : "Bootstrap Admin",
      role: "superadmin",
    };
  }

  try {
    const { rows } = await db.query(
      "SELECT id, username, name, role FROM superadmin_users WHERE id::text = $1 OR username = $2",
      [session.id, session.username]
    );

    if (rows.length > 0) {
      const r = rows[0];
      return {
        id: String(r.id),
        username: String(r.username),
        name: String(r.name || r.username),
        role: normalizeQAdminRole(r.role),
      };
    }
  } catch (err) {
    console.error("Failed to load user role:", err);
  }

  return {
    id: session.id,
    username: session.username,
    name: session.username,
    role: "ops_manager",
  };
}

export async function requireAuthJson(): Promise<NextResponse | null> {
  const session = await decodeSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function requirePermissionJson(permission: QAdminPermission): Promise<NextResponse | null> {
  const user = await getSessionUserWithRole();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.role, permission)) {
    return NextResponse.json(
      { error: `Forbidden: role '${user.role}' lacks permission '${permission}'` },
      { status: 403 }
    );
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
