import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateSuperadminCredentials } from "@/lib/auth/credentials";
import { signToken } from "@/lib/auth/token";

const SESSION_COOKIE = "qrave_sa_session";

type LocalAuthResult = {
    available: boolean;
    ok: boolean;
    subject?: string;
};

async function authenticateAgainstLocalDB(username: string, password: string): Promise<LocalAuthResult> {
    try {
        // 1. Try superadmin_users table
        const resSa = await db.query(
            "SELECT id, username, password FROM superadmin_users WHERE lower(username) = $1",
            [username.toLowerCase()]
        );

        if (resSa.rows.length > 0) {
            const user = resSa.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return { available: true, ok: true, subject: `${user.id}:${user.username}` };
            }
        }

        // 2. Try qrave_admins table
        const resQa = await db.query(
            "SELECT id, email AS username, password_hash AS password FROM qrave_admins WHERE lower(email) = $1",
            [username.toLowerCase()]
        );

        if (resQa.rows.length > 0) {
            const user = resQa.rows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch) {
                return { available: true, ok: true, subject: `${user.id}:${user.username}` };
            }
        }

        return { available: true, ok: false };
    } catch (err) {
        console.error("Local qadmin auth error:", err);
        return { available: false, ok: false };
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const username = String(body.username || "").trim().toLowerCase();
        const password = String(body.password || "").trim();

        if (!username || !password) {
            return NextResponse.json({ error: "Username and password required" }, { status: 400 });
        }

        const local = await authenticateAgainstLocalDB(username, password);
        let sessionSubject = local.subject || `bootstrap:${username}`;

        if (!local.ok) {
            const bootstrapOK = validateSuperadminCredentials(username, password);
            if (!bootstrapOK) {
                const message = local.available
                    ? "Invalid credentials"
                    : "QAdmin store unavailable and no matching bootstrap admin was found";
                return NextResponse.json({ error: message }, { status: local.available ? 401 : 503 });
            }
        }

        const token = signToken(sessionSubject);
        const res = NextResponse.json({ ok: true, message: "Logged in successfully" });

        res.cookies.set(SESSION_COOKIE, token, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 12,
        });

        return res;
    } catch (err) {
        console.error("Login error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
