import { NextResponse } from "next/server";
import { requireAuthJson } from "@/lib/auth/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
    const unauthorized = await requireAuthJson();
    if (unauthorized) return unauthorized;

    try {
        const { username, password } = await request.json();
        const normalizedUsername = String(username || "").trim().toLowerCase();

        if (!normalizedUsername || !password) {
            return NextResponse.json({ error: "username and password are required" }, { status: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query(`
      INSERT INTO superadmin_users (username, password)
      VALUES ($1, $2)
        `, [normalizedUsername, hashedPassword]);

        return NextResponse.json({ success: true, message: "Superadmin created successfully" });
    } catch (err: any) {
        if (err.code === "23505") { // unique violation
            return NextResponse.json({ error: "Username already exists" }, { status: 409 });
        }
        console.error("Error creating superadmin:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
