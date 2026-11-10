import { NextResponse } from "next/server";
import { getSessionForMfaSetup } from "@/lib/auth/server";
import { getMfaStatus, startSetup } from "@/lib/auth/mfa";
import { otpauthUrl } from "@/lib/auth/totp";
import { generateQrSvg } from "@/lib/qr";

/** Makes a new secret and returns it with a QR code to scan. */
export async function POST() {
  const session = await getSessionForMfaSetup();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const status = await getMfaStatus(session.id);
    if (status.enabled) {
      return NextResponse.json({ error: "2FA is already on. Turn it off first to set it up again." }, { status: 409 });
    }
    const secret = await startSetup(session.id);
    const url = otpauthUrl(secret, session.username);
    return NextResponse.json(
      { secret, otpauth_url: url, qr_svg: generateQrSvg(url, { size: 220, margin: 2 }), bootstrap: status.bootstrap },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("2FA setup error:", err);
    return NextResponse.json({ error: "Could not start 2FA setup" }, { status: 500 });
  }
}
