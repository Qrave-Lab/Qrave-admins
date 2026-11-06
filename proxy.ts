import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";

// First line of defence: pages need a validly signed, unexpired session.
// Each API route still checks the account and its permissions itself.
export async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    if (request.cookies.get(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
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
  ],
};
