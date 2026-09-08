import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

function shouldResetAuthCookies(error: { code?: string; message: string }) {
  return (
    error.code === "refresh_token_already_used" ||
    error.code === "refresh_token_not_found" ||
    error.code === "session_not_found" ||
    error.message.includes("Invalid Refresh Token")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.getClaims();

  if (error && shouldResetAuthCookies(error)) {
    const authCookies = request.cookies
      .getAll()
      .map((cookie) => cookie.name)
      .filter((name) => name.startsWith("sb-") && name.includes("auth-token"));

    if (authCookies.length > 0) {
      const resetResponse = NextResponse.next({ request });
      authCookies.forEach((name) => {
        resetResponse.cookies.set(name, "", {
          path: "/",
          maxAge: 0,
        });
      });
      return resetResponse;
    }
  }

  return supabaseResponse;
}
