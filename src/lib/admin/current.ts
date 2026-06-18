import { cache } from "react";
import { redirect } from "next/navigation";

import {
  getFirstAdminTenantSlug,
  normalizeTenantMemberships,
  type TenantMembershipRow,
} from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const getCurrentAdminTenantSlug = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants:tenant_id(slug)")
    .eq("user_id", user.id)
    .returns<TenantMembershipRow[]>();

  const tenantSlug = getFirstAdminTenantSlug(
    normalizeTenantMemberships(memberships),
  );

  if (!tenantSlug) {
    redirect("/login");
  }

  return tenantSlug;
});
