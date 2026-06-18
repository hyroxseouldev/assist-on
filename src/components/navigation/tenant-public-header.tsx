import { TenantHeaderNav } from "@/components/navigation/tenant-header-nav";
import type { TenantMembershipRow } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug, getTenantUserProfile, resolveTenantAvatarUrl, resolveTenantDisplayName } from "@/lib/tenant/server";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

type TenantPublicHeaderProps = {
  tenantSlug: string;
  brandLabel: string;
  logoUrl?: string | null;
};

export async function TenantPublicHeader({ tenantSlug, brandLabel, logoUrl }: TenantPublicHeaderProps) {
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

  let accountActionHref = "/admin";
  const accountActionLabel = "대시보드" as const;
  let displayName = "회원";
  let email = "";
  let avatarUrl: string | null = null;
  let hasDashboardRole = false;

  if (user) {
    const tenant = await getTenantBySlug(supabase, tenantSlug);
    const [{ data: memberships }, { data: profile }, tenantProfile] = await Promise.all([
      supabase
        .from("tenant_memberships")
        .select("tenant_id, role, tenants:tenant_id(slug)")
        .eq("user_id", user.id)
        .returns<TenantMembershipRow[]>(),
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle<ProfileRow>(),
      tenant ? getTenantUserProfile(supabase, tenant.id, user.id) : Promise.resolve(null),
    ]);

    hasDashboardRole = (memberships ?? []).some((membership) => membership.role === "owner" || membership.role === "coach");
    displayName = resolveTenantDisplayName(tenantProfile, profile, user);
    email = user.email?.trim() || "";
    avatarUrl = resolveTenantAvatarUrl(tenantProfile, profile, user);

    if (hasDashboardRole) {
      accountActionHref = "/admin";
    }
  }

  return (
    <TenantHeaderNav
      brandLabel={brandLabel}
      logoUrl={logoUrl}
      isLoggedIn={Boolean(user) && hasDashboardRole}
      accountActionHref={accountActionHref}
      accountActionLabel={accountActionLabel}
      displayName={displayName}
      email={email}
      avatarUrl={avatarUrl}
    />
  );
}
