import { type NextRequest, NextResponse } from "next/server";

import { getSignedInHomePath, isSafeInternalPath } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  let fallbackPath = "/login";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      fallbackPath = (await getSignedInHomePath(supabase)) ?? fallbackPath;
    }
  }

  const redirectPath = next && isSafeInternalPath(next) ? next : fallbackPath;
  const redirectUrl = new URL(redirectPath, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
