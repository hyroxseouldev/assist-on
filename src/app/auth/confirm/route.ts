import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type InviteRole = "owner" | "coach" | "member";

function asInviteRole(value: unknown): InviteRole | null {
  if (value === "owner" || value === "coach" || value === "member") {
    return value;
  }

  return null;
}

async function syncProfileAndTenantMembership(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
  const tenantSlug = typeof metadata.tenant_slug === "string" ? metadata.tenant_slug.trim() : "";
  const tenantRole = asInviteRole(metadata.tenant_role);

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
      role: "user",
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

  if (!tenantSlug || !tenantRole) {
    return;
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle<{ id: string }>();

  if (!tenant) {
    return;
  }

  const { data: existingMembership } = await supabase
    .from("tenant_memberships")
    .select("tenant_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle<{ tenant_id: string }>();

  if (existingMembership) {
    return;
  }

  const { error: membershipError } = await supabase.from("tenant_memberships").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: tenantRole,
  });

  if (membershipError) {
    throw membershipError;
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
      await syncProfileAndTenantMembership(supabase);
    }
  }

  const redirectUrl = new URL(next, requestUrl.origin);
  return NextResponse.redirect(redirectUrl);
}
