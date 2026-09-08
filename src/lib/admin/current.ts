import { cache } from "react";
import { redirect } from "next/navigation";

import {
  getFirstAdminTenantSlug,
  normalizeTenantMemberships,
  type TenantMembershipRow,
} from "@/lib/auth/redirects";
import { getAuthenticatedUser } from "@/lib/auth/server";

export const getCurrentAdminTenantSlug = cache(async () => {
  const { supabase, user } = await getAuthenticatedUser();

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
