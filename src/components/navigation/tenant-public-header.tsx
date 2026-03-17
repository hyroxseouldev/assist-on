import { TenantHeaderNav } from "@/components/navigation/tenant-header-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TenantMembershipRow = {
  tenant_id: string;
  role: "owner" | "coach" | "member";
  tenants: {
    slug: string;
  } | null;
};

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

  let accountActionHref = "/t/select";
  let accountActionLabel: "마이페이지" | "대시보드" = "마이페이지";
  let profileActionHref = "/mypage/profile";
  let displayName = "회원";
  let email = "";
  let avatarUrl: string | null = null;

  if (user) {
    const [{ data: memberships }, { data: profile }] = await Promise.all([
      supabase
        .from("tenant_memberships")
        .select("tenant_id, role, tenants:tenant_id(slug)")
        .eq("user_id", user.id)
        .returns<TenantMembershipRow[]>(),
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle<ProfileRow>(),
    ]);

    const hasDashboardRole = (memberships ?? []).some((membership) => membership.role === "owner" || membership.role === "coach");
    accountActionLabel = hasDashboardRole ? "대시보드" : "마이페이지";
    displayName = profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || "회원";
    email = user.email?.trim() || "";
    avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url ?? null;

    const tenantSlugs = (memberships ?? [])
      .map((membership) => membership.tenants?.slug)
      .filter((slug): slug is string => Boolean(slug));

    if (tenantSlugs.length === 1) {
      accountActionHref = hasDashboardRole ? `/t/${tenantSlugs[0]}/admin` : "/mypage";
      profileActionHref = hasDashboardRole ? `/t/${tenantSlugs[0]}/admin/profile` : "/mypage/profile";
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
