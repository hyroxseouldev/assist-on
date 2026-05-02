import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveTenantBrandLogoUrl, resolveTenantBrandName } from "@/lib/tenant/branding";
import { getTenantBySlug } from "@/lib/tenant/server";

type ProgramBranding = {
  teamName: string;
  logoUrl: string;
};

async function getProgramBrandingByTenantSlug(tenantSlug?: string): Promise<ProgramBranding> {
  if (!tenantSlug) {
    return {
      teamName: resolveTenantBrandName(),
      logoUrl: resolveTenantBrandLogoUrl(),
    };
  }

  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return {
      teamName: resolveTenantBrandName(),
      logoUrl: resolveTenantBrandLogoUrl(),
    };
  }

  const { data: tenantBranding } = await supabase
    .from("tenant_branding")
    .select("logo_url")
    .eq("tenant_id", tenant.id)
    .maybeSingle<{ logo_url: string | null }>();

  return {
    teamName: resolveTenantBrandName(tenant.name),
    logoUrl: resolveTenantBrandLogoUrl(tenantBranding?.logo_url),
  };
}

export async function getPrimaryProgramBranding(): Promise<ProgramBranding> {
  return getProgramBrandingByTenantSlug();
}

export async function getPrimaryProgramBrandingForTenant(tenantSlug?: string): Promise<ProgramBranding> {
  return getProgramBrandingByTenantSlug(tenantSlug);
}
