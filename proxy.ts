import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

// First line of defence: pages need a validly signed, unexpired session,
// and admins who still have to set up 2FA are kept on /security.
// Each API route still checks the account and its permissions itself.
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    if (request.cookies.get(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }
  // Signed in with a password but 2FA isn't set up yet: only the setup screen.
  if (session.mfa === "setup" && !request.nextUrl.pathname.startsWith("/security")) {
    return NextResponse.redirect(new URL("/security", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/operations/:path*",
    "/restaurants/:path*",
    "/food-courts/:path*",
    "/plans/:path*",
    "/menu/:path*",
    "/staff/:path*",
    "/discounts/:path*",
    "/coupons/:path*",
    "/revenue/:path*",
    "/analytics/:path*",
    "/logs/:path*",
    "/qadmins/:path*",
    "/security/:path*",
  ],
};
