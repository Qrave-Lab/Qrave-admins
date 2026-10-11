import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAuthJson, decodeSession, getSessionUserWithRole } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { listBootstrapCredentials } from "@/lib/auth/credentials";
import { listQAdminUsers } from "@/lib/superadmin/queries";
import { recordAuditLog } from "@/lib/audit";
import { normalizeQAdminRole, ROLE_DEFINITIONS } from "@/lib/auth/roles";

async function isSuperadmin(): Promise<boolean> {
  const session = await getSessionUserWithRole();
  return session?.role === "superadmin";
}

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const sessionUser = await getSessionUserWithRole();
    const users = await listQAdminUsers();
    const bootstrap = listBootstrapCredentials().map((item) => ({
      id: `bootstrap:${item.username}`,
      username: item.username,
      name: "Bootstrap Admin",
      role: "superadmin",
      createdAt: "Bootstrap credential",
    }));

    const merged = [...bootstrap, ...users.filter((user) => !bootstrap.some((item) => item.username === user.username))];
    
    return NextResponse.json({
      users: merged,
      currentUser: sessionUser,
      roles: Object.values(ROLE_DEFINITIONS),
    });
  } catch (err) {
    console.error("list qadmins error:", err);
    return NextResponse.json({ error: "failed to list qadmins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const superadmin = await isSuperadmin();
  if (!superadmin) {
    return NextResponse.json({ error: "forbidden, only superadmin can create users" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();
    const name = String(body.name || "").trim();
    const role = normalizeQAdminRole(body.role);

    if (!username || !password) {
      return NextResponse.json({ error: "username and password are required" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const insertRes = await db.query(
      `INSERT INTO superadmin_users (username, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id`,
      [username, hashedPassword, name, role],
    );

    await recordAuditLog({
      action: "QADMIN_CREATE",
      entityType: "qadmin",
      entityId: insertRes.rows[0]?.id,
      entityName: name || username,
      details: {
        username,
        role,
        name: name || null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "username already exists" }, { status: 409 });
    }
    console.error("create qadmin error:", err);
    return NextResponse.json({ error: "failed to create qadmin" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const superadmin = await isSuperadmin();
  if (!superadmin) {
    return NextResponse.json({ error: "forbidden, only superadmin can edit users" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = body.id;
    const username = String(body.username || "").trim();
    const name = String(body.name || "").trim();
    const role = body.role ? normalizeQAdminRole(body.role) : null;

    if (!id || !username) {
      return NextResponse.json({ error: "id and username are required" }, { status: 400 });
    }

    await db.query(
      `UPDATE superadmin_users 
       SET username = $1, name = $2, role = COALESCE($3, role) 
       WHERE id = $4`,
      [username, name, role, id]
    );

    await recordAuditLog({
      action: "QADMIN_UPDATE",
      entityType: "qadmin",
      entityId: id,
      entityName: name || username,
      details: {
        username,
        name,
        role: role || undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("update qadmin error:", err);
    return NextResponse.json({ error: "failed to update qadmin" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  const superadmin = await isSuperadmin();
  if (!superadmin) {
    return NextResponse.json({ error: "forbidden, only superadmin can delete users" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    let deletedUser = id;
    try {
      const dRes = await db.query("SELECT username, name FROM superadmin_users WHERE id = $1", [id]);
      if (dRes.rows[0]) {
        deletedUser = dRes.rows[0].name || dRes.rows[0].username || id;
      }
    } catch {}

    await db.query(`DELETE FROM superadmin_users WHERE id = $1`, [id]);

    await recordAuditLog({
      action: "QADMIN_DELETE",
      entityType: "qadmin",
      entityId: id,
      entityName: deletedUser,
      details: {
        deleted_id: id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("delete qadmin error:", err);
    return NextResponse.json({ error: "failed to delete qadmin" }, { status: 500 });
  }
}
