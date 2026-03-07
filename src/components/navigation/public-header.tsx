import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PublicHeaderNav } from "@/components/navigation/public-header-nav";

type TenantMembershipRow = {
  tenant_id: string;
  role: "owner" | "coach" | "member";
  tenants: {
    slug: string;
  } | null;
};

export async function PublicHeader() {
  const supabase = await createSupabaseServerClient();

  let user: { id: string } | null = null;
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

  if (user) {
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenants:tenant_id(slug)")
      .eq("user_id", user.id)
      .returns<TenantMembershipRow[]>();

    const hasDashboardRole = (memberships ?? []).some((membership) => membership.role === "owner" || membership.role === "coach");
    accountActionLabel = hasDashboardRole ? "대시보드" : "마이페이지";

    const tenantSlugs = (memberships ?? [])
      .map((membership) => membership.tenants?.slug)
      .filter((slug): slug is string => Boolean(slug));

    if (tenantSlugs.length === 1) {
      accountActionHref = hasDashboardRole ? `/t/${tenantSlugs[0]}/admin` : "/mypage";
    }

    if (!hasDashboardRole) {
      accountActionHref = "/mypage";
    }
  }

  return (
    <PublicHeaderNav
      isLoggedIn={Boolean(user)}
      accountActionHref={accountActionHref}
      accountActionLabel={accountActionLabel}
    />
  );
}
