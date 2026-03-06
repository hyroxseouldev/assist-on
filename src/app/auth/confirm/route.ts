import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

async function syncProfile(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";

  const fallbackName = user.email?.split("@")[0] ?? "Member";

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, full_name, platform_role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; full_name: string | null; platform_role: string | null }>();

  if (!existingProfile) {
    const { error: insertProfileError } = await supabase.from("profiles").insert({
      id: user.id,
      full_name: fullName || fallbackName,
      platform_role: "user",
    });

    if (insertProfileError) {
      throw insertProfileError;
    }
  } else {
    const nextFullName = existingProfile.full_name?.trim() ? existingProfile.full_name : fullName || fallbackName;
    const patch: Record<string, string> = {};

    if (!existingProfile.full_name?.trim() && nextFullName) {
      patch.full_name = nextFullName;
    }

    if (!existingProfile.platform_role) {
      patch.platform_role = "user";
    }

    if (Object.keys(patch).length > 0) {
      const { error: updateProfileError } = await supabase.from("profiles").update(patch).eq("id", user.id);
      if (updateProfileError) {
        throw updateProfileError;
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/t/select";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      await syncProfile(supabase);
    }
  }

  const redirectPath = isSafeInternalPath(next) ? next : "/t/select";
  const redirectUrl = new URL(redirectPath, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
