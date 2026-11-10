import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";
import { db } from "@/lib/db";
import { QAdminRole, QAdminPermission, hasPermission, normalizeQAdminRole, permissionsFor } from "@/lib/auth/roles";
import { listBootstrapCredentials } from "@/lib/auth/credentials";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

export { SESSION_COOKIE };

export type SessionUser = {
  id: string;
  username: string;
  /** "setup" means 2FA must be set up before anything else is allowed. */
  mfa: "ok" | "setup";
};

export type FullSessionUser = {
  id: string;
  username: string;
  name: string;
  role: QAdminRole;
};

const BOOTSTRAP_PREFIX = "bootstrap:";
// The platform owner's account always has full access.
const OWNER_USERNAME = "anandu";

/** The signed-in admin from the signed session cookie, or null. */
export async function decodeSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const payload = await verifySession(cookieStore.get(SESSION_COOKIE)?.value);
  return payload ? { id: payload.id, username: payload.username, mfa: payload.mfa } : null;
}

/**
 * The signed-in admin even if they still have to set up 2FA. Only for the 2FA
 * setup screen and its API; everything else uses getSessionUserWithRole.
 */
export async function getSessionForMfaSetup(): Promise<SessionUser | null> {
  const session = await decodeSession();
  if (!session) return null;
  if (session.id.startsWith(BOOTSTRAP_PREFIX)) {
    const username = session.id.slice(BOOTSTRAP_PREFIX.length);
    return listBootstrapCredentials().some((c) => c.username === username) ? session : null;
  }
  try {
    const { rows } = await db.query("SELECT 1 FROM superadmin_users WHERE id::text = $1", [session.id]);
    return rows.length ? session : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in admin with their current role. Returns null when the account
 * was removed (or its bootstrap credential was taken out of the env), so a
 * deleted admin loses access straight away. Memoised per request.
 */
export const getSessionUserWithRole = cache(async (): Promise<FullSessionUser | null> => {
  const session = await decodeSession();
  // Until 2FA is set up, the admin can only reach the setup screen.
  if (!session || session.mfa !== "ok") return null;

  if (session.id.startsWith(BOOTSTRAP_PREFIX)) {
    const username = session.id.slice(BOOTSTRAP_PREFIX.length);
    const stillConfigured = listBootstrapCredentials().some((c) => c.username === username);
    if (!stillConfigured) return null;
    return { id: session.id, username, name: "Bootstrap Admin", role: "superadmin" };
  }

  try {
    const { rows } = await db.query("SELECT id, username, name, role FROM superadmin_users WHERE id::text = $1", [session.id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    const username = String(r.username);
    const isOwner = username.toLowerCase() === OWNER_USERNAME;
    return {
      id: String(r.id),
      username,
      name: String(r.name || (isOwner ? "Anantha Krishnan" : username)),
      role: isOwner ? "superadmin" : normalizeQAdminRole(r.role),
    };
  } catch (err) {
    console.error("Failed to load admin role:", err);
    return null;
  }
});

export async function requireAuthJson(): Promise<NextResponse | null> {
  const user = await getSessionUserWithRole();
  if (!user) {
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
      { error: `Your role (${user.role}) doesn't have permission for this (${permission}).` },
      { status: 403 },
    );
  }
  return null;
}

/** For server actions: returns the admin's username, or throws when they lack the permission. */
export async function assertPermission(permission: QAdminPermission): Promise<string> {
  const user = await getSessionUserWithRole();
  if (!user) throw new Error("Unauthorized");
  if (!hasPermission(user.role, permission)) {
    throw new Error(`Your role (${user.role}) doesn't have permission for this (${permission}).`);
  }
  return user.username;
}

export async function requireAuthPage(): Promise<FullSessionUser> {
  const user = await getSessionUserWithRole();
  if (!user) {
    const pending = await decodeSession();
    redirect(pending?.mfa === "setup" ? "/security" : "/login");
  }
  return user;
}

export async function requireSessionEmail(): Promise<string | null> {
  const user = await getSessionUserWithRole();
  return user?.username || null;
}

export async function sessionPermissions(): Promise<{ user: FullSessionUser; permissions: QAdminPermission[] } | null> {
  const user = await getSessionUserWithRole();
  if (!user) return null;
  return { user, permissions: permissionsFor(user.role) };
}
