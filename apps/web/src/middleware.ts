import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { decodeJwtPayload } from "@/lib/jwtPayload";

const SMS_TOKEN = "sms_token";

const ROLE_PREFIX: Record<string, string> = {
  admin: "/admin",
  headteacher: "/headteacher",
  class_teacher: "/class-teacher",
  subject_teacher: "/subject-teacher",
  bursar: "/bursar",
};

function dashboardPath(role: string): string {
  const prefix = ROLE_PREFIX[role];
  return prefix ? `${prefix}/dashboard` : "/login";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SMS_TOKEN)?.value ?? null;

  if (!token) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  const payload = decodeJwtPayload(token);
  const role = typeof payload?.role === "string" ? payload.role : null;

  if (!role || !ROLE_PREFIX[role]) {
    const login = new URL("/login", request.url);
    const res = NextResponse.redirect(login);
    res.cookies.delete(SMS_TOKEN);
    return res;
  }

  const allowedPrefix = ROLE_PREFIX[role];
  if (!pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL(dashboardPath(role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/headteacher/:path*",
    "/class-teacher/:path*",
    "/subject-teacher/:path*",
    "/bursar/:path*",
  ],
};
