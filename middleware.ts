import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "qrave_sa_session";

const protectedRoutes = [
  "/dashboard",
  "/restaurants",
  "/revenue",
  "/analytics",
  "/operations",
  "/menu",
  "/staff",
  "/discounts",
  "/logs",
  "/qadmins",
  "/coupons",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtected) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (!token) {
      const login = new URL("/login", request.url);
      return NextResponse.redirect(login);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/restaurants/:path*",
    "/revenue/:path*",
    "/analytics/:path*",
    "/operations/:path*",
    "/menu/:path*",
    "/staff/:path*",
    "/discounts/:path*",
    "/logs/:path*",
    "/qadmins/:path*",
    "/coupons/:path*",
  ],
};
