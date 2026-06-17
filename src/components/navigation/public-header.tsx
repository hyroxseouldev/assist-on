import { getDefaultSignedInPath, normalizeTenantMemberships, type TenantMembershipRow } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PublicHeaderNav } from "@/components/navigation/public-header-nav";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

export async function PublicHeader() {
  const supabase = await createSupabaseServerClient();

  let user: { id: string; email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } } | null = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch {
    user = null;
  }

  let accountActionHref = "/";
  const accountActionLabel = "대시보드" as const;
  let displayName = "회원";
  let email = "";
  let avatarUrl: string | null = null;
  let hasDashboardRole = false;

  if (user) {
    const [{ data: memberships }, { data: profile }] = await Promise.all([
      supabase
        .from("tenant_memberships")
        .select("tenant_id, role, tenants:tenant_id(slug)")
        .eq("user_id", user.id)
        .returns<TenantMembershipRow[]>(),
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle<ProfileRow>(),
    ]);

    hasDashboardRole = (memberships ?? []).some((membership) => membership.role === "owner" || membership.role === "coach");
    displayName = profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || "회원";
    email = user.email?.trim() || "";
    avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;

    const tenantMemberships = normalizeTenantMemberships(memberships);

    if (hasDashboardRole) {
      accountActionHref = getDefaultSignedInPath(tenantMemberships) ?? "/";
    }
  }

  return (
    <PublicHeaderNav
      brandHref="/"
      brandLabel="CLYRTRAINING"
      isLoggedIn={Boolean(user) && hasDashboardRole}
      accountActionHref={accountActionHref}
      accountActionLabel={accountActionLabel}
      displayName={displayName}
      email={email}
      avatarUrl={avatarUrl}
    />
  );
}
