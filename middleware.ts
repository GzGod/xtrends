import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    // Don't block the login page or login API
    if (pathname === "/admin/login" || pathname === "/api/admin/login") return NextResponse.next();

    const adminSecret = process.env.ADMIN_SECRET;
    const cookie = req.cookies.get("admin_auth")?.value;

    if (!adminSecret || cookie !== adminSecret) {
      if (pathname.startsWith("/api/admin")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
