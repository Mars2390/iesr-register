// Route protection. Verifies the session JWT (edge-safe via jose) and gates
// /teacher and /admin by role. Unauthenticated -> /login; wrong role -> their home.
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const needsAuth = pathname.startsWith("/teacher") || pathname.startsWith("/admin");
  if (needsAuth && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session) {
    if (pathname.startsWith("/admin") && session.role !== "admin")
      return NextResponse.redirect(new URL("/teacher", req.url));
    if (pathname.startsWith("/teacher") && session.role !== "teacher")
      return NextResponse.redirect(new URL("/admin", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/teacher/:path*", "/admin/:path*"] };
