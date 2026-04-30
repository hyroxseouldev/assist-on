import { TenantHeaderNav } from "@/components/navigation/tenant-header-nav";
import { getDefaultSignedInPath, normalizeTenantMemberships, type TenantMembershipRow } from "@/lib/auth/redirects";
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

  let accountActionHref = "/mypage";
  let accountActionLabel: "마이페이지" | "대시보드" = "마이페이지";
  let profileActionHref = "/mypage/profile";
  let displayName = "회원";
  let email = "";
  let avatarUrl: string | null = null;

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

    const hasDashboardRole = (memberships ?? []).some((membership) => membership.role === "owner" || membership.role === "coach");
    accountActionLabel = hasDashboardRole ? "대시보드" : "마이페이지";
    displayName = resolveTenantDisplayName(tenantProfile, profile, user);
    email = user.email?.trim() || "";
    avatarUrl = resolveTenantAvatarUrl(tenantProfile, profile, user);

    const tenantMemberships = normalizeTenantMemberships(memberships);

    if (hasDashboardRole) {
      accountActionHref = getDefaultSignedInPath(tenantMemberships);
      const primaryAdminMembership = tenantMemberships.find((membership) => membership.role === "owner" || membership.role === "coach");
      profileActionHref = primaryAdminMembership ? `/t/${primaryAdminMembership.slug}/admin/profile` : "/mypage/profile";
    }

    if (!hasDashboardRole) {
      accountActionHref = "/mypage";
      profileActionHref = "/mypage/profile";
    }
  }

  return (
    <TenantHeaderNav
      tenantSlug={tenantSlug}
      brandLabel={brandLabel}
      logoUrl={logoUrl}
      isLoggedIn={Boolean(user)}
      accountActionHref={accountActionHref}
      accountActionLabel={accountActionLabel}
      profileActionHref={profileActionHref}
      displayName={displayName}
      email={email}
      avatarUrl={avatarUrl}
    />
  );
}
