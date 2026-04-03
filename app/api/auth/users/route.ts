import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { addSuperadminCredential } from "@/lib/auth/credentials";

type Req = {
  email: string;
  password: string;
};

export async function POST(request: Request) {
  const bootstrapKey = String(process.env.SUPERADMIN_BOOTSTRAP_KEY || "").trim();
  if (!bootstrapKey) {
    return NextResponse.json({ error: "bootstrap key not configured" }, { status: 503 });
  }

  const provided = String(request.headers.get("x-bootstrap-key") || "").trim();
  if (!provided || provided !== bootstrapKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<Req>;
  const email = String(body.email || "");
  const password = String(body.password || "");

  if (!email.trim() || !password.trim()) {
    return NextResponse.json({ error: "email and password required" }, { status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    await db.query(
      `INSERT INTO superadmin_users (username, password) VALUES ($1, $2)`,
      [email.trim().toLowerCase(), hashedPassword],
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const fallback = addSuperadminCredential({
      username: email.trim().toLowerCase(),
      password: password.trim(),
    });
    if (fallback.ok) {
      return NextResponse.json({ ok: true, mode: "bootstrap-memory" });
    }
    if (err?.code === "23505") {
      return NextResponse.json({ error: "user already exists" }, { status: 409 });
    }
    console.error("bootstrap create user error:", err);
    return NextResponse.json({ error: "failed to create user" }, { status: 500 });
  }
}
