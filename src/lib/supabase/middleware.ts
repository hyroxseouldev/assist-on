import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";

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

  try {
    await supabase.auth.getUser();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const shouldResetAuthCookies =
      message.includes("refresh_token_already_used") ||
      message.includes("Invalid Refresh Token") ||
      message.includes("AuthApiError");

    if (shouldResetAuthCookies) {
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
  }

  return supabaseResponse;
}
