import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const TENANT_COOKIE_KEY = "assiston_tenant_slug";

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

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
