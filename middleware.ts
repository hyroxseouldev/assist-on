import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const TENANT_COOKIE_KEY = "assiston_tenant_slug";
const DEFAULT_TENANT_SLUG = "assist-on";

const legacyAppPathPrefixes = ["/about", "/notices", "/community", "/offline-classes", "/profile", "/admin"];

function isLegacyAppPath(pathname: string) {
  return legacyAppPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const tenantPathMatch = pathname.match(/^\/t\/([^/]+)/);

  if (tenantPathMatch?.[1]) {
    const response = await updateSession(request);
    response.cookies.set(TENANT_COOKIE_KEY, tenantPathMatch[1], {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  if (isLegacyAppPath(pathname)) {
    const tenantSlug = request.cookies.get(TENANT_COOKIE_KEY)?.value || DEFAULT_TENANT_SLUG;
    const url = request.nextUrl.clone();
    url.pathname = `/t/${tenantSlug}${pathname}`;
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
