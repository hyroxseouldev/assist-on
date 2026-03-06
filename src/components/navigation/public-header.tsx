import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PublicHeaderNav } from "@/components/navigation/public-header-nav";

type TenantMembershipRow = {
  tenant_id: string;
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

  let tenantEntryHref = "/t/select";

  if (user) {
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, tenants:tenant_id(slug)")
      .eq("user_id", user.id)
      .returns<TenantMembershipRow[]>();

    const tenantSlugs = (memberships ?? [])
      .map((membership) => membership.tenants?.slug)
      .filter((slug): slug is string => Boolean(slug));

    if (tenantSlugs.length === 1) {
      tenantEntryHref = `/t/${tenantSlugs[0]}`;
    }
  }

  return <PublicHeaderNav isLoggedIn={Boolean(user)} tenantEntryHref={tenantEntryHref} />;
}
