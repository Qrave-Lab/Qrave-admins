import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { listBootstrapCredentials } from "@/lib/auth/credentials";
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
    const username = String(body.username || "").trim();
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
