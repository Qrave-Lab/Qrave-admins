import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { validateSuperadminCredentials } from "@/lib/auth/credentials";
import { SignJWT } from "jose";

const SESSION_COOKIE = "qrave_sa_session";
const secretKey = new TextEncoder().encode(process.env.SUPERADMIN_API_KEY || "superadmin-secret-dev-key");

type LocalAuthResult = {
    available: boolean;
    ok: boolean;
    subject?: string;
};

async function authenticateAgainstLocalDB(username: string, password: string): Promise<LocalAuthResult> {
    try {
        const { rows } = await db.query(
            "SELECT id, username, password FROM superadmin_users WHERE lower(username) = $1",
            [username.toLowerCase()]
        );

        if (rows.length === 0) {
            return { available: true, ok: false };
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return { available: true, ok: false };
        }

        return { available: true, ok: true, subject: `${user.id}:${user.username}` };
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

        const [id, ...userParts] = sessionSubject.split(":");
        const token = await new SignJWT({ id, username: userParts.join(":") })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("12h")
            .sign(secretKey);

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
