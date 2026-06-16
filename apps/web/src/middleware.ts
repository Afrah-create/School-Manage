import type { NextRequest } from "next/server";

import { NextResponse } from "next/server";

import { decodeJwtPayload } from "@/lib/jwtPayload";

import { isValidPlatformToken } from "@/lib/platformSession";

import {
  isForcePasswordChangePath,
  isPasswordSetupPath,
  isPlatformHost,
  isPublicSchoolAuthPath,
  passwordSetupPath,
  tenantSlugFromHost,
} from "@/lib/tenantHost";
import { usesSubdomainTenancy } from "@/lib/tenantRouting";



const SMS_TOKEN = "sms_token";

const PLATFORM_TOKEN = "sms_platform_token";

const TENANT_REDIRECT_COOKIE = "sms_tenant_redir";

const HOSTNAME_SLUG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;



const ROLE_PREFIX: Record<string, string> = {

  admin: "/admin",

  headteacher: "/headteacher",

  class_teacher: "/class-teacher",

  subject_teacher: "/subject-teacher",

  bursar: "/bursar",

};



/** Prefer Host header — Next.js may set nextUrl.hostname to "localhost" for *.localhost in dev. */

function requestHostname(request: NextRequest): string {

  const host = request.headers.get("host");

  if (host) return host.split(":")[0]!.toLowerCase();

  return request.nextUrl.hostname.toLowerCase();

}



function isBareLocalHost(hostname: string): boolean {

  return hostname === "localhost" || hostname === "127.0.0.1";

}



function dashboardPath(role: string): string {

  const prefix = ROLE_PREFIX[role];

  return prefix ? `${prefix}/dashboard` : "/login";

}



function readSmsToken(request: NextRequest): string | null {

  const raw = request.cookies.get(SMS_TOKEN)?.value ?? null;

  if (!raw) return null;

  if (raw.includes("%")) {

    try {

      return decodeURIComponent(raw);

    } catch {

      return raw;

    }

  }

  return raw;

}



function schoolSessionFromToken(token: string | null): {

  role: string | null;

  tokenSlug: string | null;

  isPlatformAud: boolean;

  forcePasswordChange: boolean;

} {

  if (!token) return { role: null, tokenSlug: null, isPlatformAud: false, forcePasswordChange: false };

  const payload = decodeJwtPayload(token);

  if (!payload) return { role: null, tokenSlug: null, isPlatformAud: false, forcePasswordChange: false };

  const role = typeof payload.role === "string" ? payload.role : null;

  const tokenSlug =

    typeof payload.tsl === "string" ? payload.tsl.trim().toLowerCase() : null;

  return {
    role,
    tokenSlug,
    isPlatformAud: payload.aud === "platform",
    forcePasswordChange: payload.fpc === 1,
  };

}



function redirectPasswordSetup(
  request: NextRequest,
  role: string,
  forcePasswordChange: boolean,
  pathname: string,
  tokenSlug: string | null,
): NextResponse | null {
  const setupPath = passwordSetupPath(role, forcePasswordChange);
  if (!setupPath || isPasswordSetupPath(pathname, role)) return null;

  if (tokenSlug) {
    const tenantRedirect = tenantHostRedirect(request, tokenSlug, setupPath);
    if (tenantRedirect) return tenantRedirect;
  }

  return redirectOnSameHost(request, setupPath);
}



function buildSchoolSubdomainUrl(

  request: NextRequest,

  slug: string,

  pathname: string,

  search = request.nextUrl.search,

): URL | null {

  if (!HOSTNAME_SLUG.test(slug)) return null;

  const hostname = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (!usesSubdomainTenancy(hostname)) return null;

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;

  const proto = request.nextUrl.protocol || "http:";

  const port = request.nextUrl.port;

  const portPart = port ? `:${port}` : "";



  try {

    return new URL(`${proto}//${slug}.localhost${portPart}${path}${search}`);

  } catch {

    return null;

  }

}



function redirectOnSameHost(

  request: NextRequest,

  pathname: string,

  options?: { from?: string },

): NextResponse {

  const search = options?.from ? `?from=${encodeURIComponent(options.from)}` : "";

  const hostname = requestHostname(request);

  const slug = tenantSlugFromHost(hostname) ?? (isBareLocalHost(hostname) ? "default" : null);



  if (slug) {

    const built = buildSchoolSubdomainUrl(request, slug, pathname, search);

    if (built) return NextResponse.redirect(built);

  }



  try {

    const url = request.nextUrl.clone();

    url.pathname = pathname;

    url.search = search;

    return NextResponse.redirect(url);

  } catch {

    return NextResponse.next();

  }

}



function tenantHostRedirect(

  request: NextRequest,

  tokenSlug: string,

  pathname: string,

): NextResponse | null {

  const hostname = requestHostname(request);

  const targetSlug = tokenSlug.trim().toLowerCase();

  if (!targetSlug || !HOSTNAME_SLUG.test(targetSlug)) return null;

  if (!usesSubdomainTenancy(hostname)) return null;

  const currentSlug = tenantSlugFromHost(hostname)?.toLowerCase() ?? null;

  if (currentSlug === targetSlug) return null;



  if (!currentSlug && isBareLocalHost(hostname) && targetSlug === "default") {

    return null;

  }



  if (hostname === `${targetSlug}.localhost`) return null;



  if (isBareLocalHost(hostname)) {

    const tried = request.cookies.get(TENANT_REDIRECT_COOKIE)?.value;

    if (tried === targetSlug) return null;

  }



  const url = buildSchoolSubdomainUrl(request, targetSlug, pathname);

  if (!url) return null;



  const res = NextResponse.redirect(url);

  if (isBareLocalHost(hostname)) {

    res.cookies.set(TENANT_REDIRECT_COOKIE, targetSlug, { path: "/", maxAge: 30 });

  }

  return res;

}



function clearPlatformCookie(res: NextResponse): void {

  res.cookies.set(PLATFORM_TOKEN, "", { path: "/", maxAge: 0 });

}



export function middleware(request: NextRequest) {

  const { pathname } = request.nextUrl;

  const hostname = requestHostname(request);



  if (pathname.startsWith("/platform")) {

    const platformToken = request.cookies.get(PLATFORM_TOKEN)?.value ?? null;

    const isLoginPage = pathname === "/platform/login" || pathname.startsWith("/platform/login/");



    if (isLoginPage) {

      if (isValidPlatformToken(platformToken)) {

        return redirectOnSameHost(request, "/platform/tenants");

      }

      return NextResponse.next();

    }



    if (!isValidPlatformToken(platformToken)) {

      const res = redirectOnSameHost(request, "/platform/login");

      clearPlatformCookie(res);

      return res;

    }



    if (!isPlatformHost(hostname) && !isBareLocalHost(hostname) && usesSubdomainTenancy(hostname)) {

      const url = buildSchoolSubdomainUrl(request, "platform", pathname);

      if (url) return NextResponse.redirect(url);

      return NextResponse.next();

    }



    return NextResponse.next();

  }



  if (isPlatformHost(hostname) && !pathname.startsWith("/platform")) {

    const platformToken = request.cookies.get(PLATFORM_TOKEN)?.value ?? null;

    if (isValidPlatformToken(platformToken)) {

      return redirectOnSameHost(request, "/platform/tenants");

    }

    return redirectOnSameHost(request, "/platform/login");

  }



  const slug = tenantSlugFromHost(hostname);

  if (!slug && isBareLocalHost(hostname) && pathname === "/") {

    return NextResponse.redirect(new URL("http://default.localhost:3000/login"));

  }



  if (isPublicSchoolAuthPath(pathname)) {

    const token = readSmsToken(request);

    const { role, tokenSlug, isPlatformAud, forcePasswordChange } = schoolSessionFromToken(token);



    if (token && isPlatformAud) {

      const res = NextResponse.next();

      res.cookies.delete(SMS_TOKEN);

      return res;

    }



    const skipDashboardRedirect =
      request.nextUrl.searchParams.has("session") ||
      request.nextUrl.searchParams.has("reason");

    if (token && role && ROLE_PREFIX[role] && !skipDashboardRedirect) {
      const setupRedirect = redirectPasswordSetup(
        request,
        role,
        forcePasswordChange,
        pathname,
        tokenSlug,
      );
      if (setupRedirect) return setupRedirect;

      if (!forcePasswordChange && !isForcePasswordChangePath(pathname)) {
      const dash = dashboardPath(role);

      if (tokenSlug) {

        const tenantRedirect = tenantHostRedirect(request, tokenSlug, dash);

        if (tenantRedirect) return tenantRedirect;

        const hostSlug = tenantSlugFromHost(hostname)?.toLowerCase() ?? null;

        if (hostSlug && hostSlug !== tokenSlug) {

          return NextResponse.next();

        }

      }

      return redirectOnSameHost(request, dash);
      }
    }



    return NextResponse.next();

  }



  const token = readSmsToken(request);



  if (!token) {

    return redirectOnSameHost(request, "/login", {

      from: pathname !== "/login" ? pathname : undefined,

    });

  }



  const { role, tokenSlug, isPlatformAud, forcePasswordChange } = schoolSessionFromToken(token);



  if (isPlatformAud) {

    const res = redirectOnSameHost(request, "/login");

    res.cookies.delete(SMS_TOKEN);

    return res;

  }



  if (tokenSlug) {

    const tenantRedirect = tenantHostRedirect(request, tokenSlug, pathname);

    if (tenantRedirect) return tenantRedirect;

  }



  if (!role || !ROLE_PREFIX[role]) {

    const res = redirectOnSameHost(request, "/login");

    res.cookies.delete(SMS_TOKEN);

    return res;

  }



  const setupRedirect = redirectPasswordSetup(
    request,
    role,
    forcePasswordChange,
    pathname,
    tokenSlug,
  );
  if (setupRedirect) return setupRedirect;



  if (pathname.startsWith("/profile")) {

    return NextResponse.next();

  }



  const allowedPrefix = ROLE_PREFIX[role];

  if (!pathname.startsWith(allowedPrefix)) {

    const dash = dashboardPath(role);

    if (pathname === dash || pathname.startsWith(`${dash}/`)) {

      return NextResponse.next();

    }

    return redirectOnSameHost(request, dash);

  }



  return NextResponse.next();

}



export const config = {

  matcher: [

    "/platform",

    "/platform/:path*",

    "/login",

    "/login/:path*",

    "/auth/:path*",

    "/admin/:path*",

    "/headteacher/:path*",

    "/class-teacher/:path*",

    "/subject-teacher/:path*",

    "/bursar/:path*",

    "/profile",

    "/profile/:path*",

    "/",

  ],

};

