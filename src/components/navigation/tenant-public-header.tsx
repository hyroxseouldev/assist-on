import { TenantHeaderNav } from "@/components/navigation/tenant-header-nav";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { getTenantUserProfile, resolveTenantAvatarUrl, resolveTenantDisplayName } from "@/lib/tenant/server";

type ProfileRow = {
  full_name: string | null;
  avatar_url: string | null;
};

type TenantPublicHeaderProps = {
  tenantId: string;
  brandLabel: string;
  logoUrl?: string | null;
};

export async function TenantPublicHeader({ tenantId, brandLabel, logoUrl }: TenantPublicHeaderProps) {
  const { supabase, user } = await getAuthenticatedUser();

  let accountActionHref = "/admin";
  const accountActionLabel = "대시보드" as const;
  let displayName = "회원";
  let email = "";
  let avatarUrl: string | null = null;
  let hasDashboardRole = false;

  if (user) {
    const [{ data: dashboardMembership }, { data: profile }, tenantProfile] = await Promise.all([
      supabase
        .from("tenant_memberships")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["owner", "coach"])
        .limit(1)
        .maybeSingle<{ role: "owner" | "coach" }>(),
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle<ProfileRow>(),
      getTenantUserProfile(supabase, tenantId, user.id),
    ]);

    hasDashboardRole = Boolean(dashboardMembership);
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
