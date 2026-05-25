import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { listBootstrapCredentials, removeSuperadminCredential } from "@/lib/auth/credentials";
import { listQAdminUsers } from "@/lib/superadmin/queries";

export async function GET() {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const users = await listQAdminUsers();
    const bootstrap = listBootstrapCredentials().map((item) => ({
      id: `bootstrap:${item.username}`,
      username: item.username,
      createdAt: "Bootstrap credential",
    }));

    const merged = [...bootstrap, ...users.filter((user) => !bootstrap.some((item) => item.username === user.username))];
    return NextResponse.json(merged);
  } catch (err) {
    console.error("list qadmins error:", err);
    const bootstrap = listBootstrapCredentials().map((item) => ({
      id: `bootstrap:${item.username}`,
      username: item.username,
      createdAt: "Bootstrap credential",
    }));
    if (bootstrap.length > 0) {
      return NextResponse.json(bootstrap);
    }
    return NextResponse.json({ error: "failed to list qadmins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!username || !password) {
      return NextResponse.json({ error: "username and password are required" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO superadmin_users (username, password) VALUES ($1, $2)`,
      [username, hashedPassword],
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "username already exists" }, { status: 409 });
    }
    console.error("create qadmin error:", err);
    return NextResponse.json({ error: "failed to create qadmin" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = await requireAuthJson();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const username = String(body.username || "").trim().toLowerCase();
    if (!username) {
      return NextResponse.json({ error: "username required" }, { status: 400 });
    }

    // Count total admins (DB + bootstrap)
    const bs = listBootstrapCredentials().map((b) => b.username);
    const countRes = await db.query("SELECT COUNT(*) AS cnt FROM superadmin_users");
    const dbCount = Number(countRes.rows?.[0]?.cnt || 0);
    const bootstrapCount = bs.length;
    const total = dbCount + bootstrapCount;

    if (total <= 1) {
      return NextResponse.json({ error: "At least one admin must remain" }, { status: 400 });
    }

    // Try DB delete first
    const { rows } = await db.query(
      "SELECT id FROM superadmin_users WHERE lower(username) = $1",
      [username]
    );
    if (rows.length > 0) {
      await db.query("DELETE FROM superadmin_users WHERE id = $1", [rows[0].id]);
      return NextResponse.json({ ok: true });
    }

    // Fallback to bootstrap removal
    if (bs.includes(username)) {
      const removed = removeSuperadminCredential(username);
      if (removed.ok) return NextResponse.json({ ok: true });
      return NextResponse.json({ error: removed.reason || "failed to remove bootstrap" }, { status: 500 });
    }

    return NextResponse.json({ error: "user not found" }, { status: 404 });
  } catch (err) {
    console.error("delete qadmin error:", err);
    return NextResponse.json({ error: "failed to delete qadmin" }, { status: 500 });
  }
}
