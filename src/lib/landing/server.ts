import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantById, getTenantBySlug } from "@/lib/tenant/server";

export type TenantPublicSiteData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  branding: {
    team_name: string | null;
    slogan: string | null;
    description: string | null;
    logo_url: string | null;
  };
};

export type TenantMarketingLandingData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  branding: {
    team_name: string | null;
    slogan: string | null;
    description: string | null;
    logo_url: string | null;
  };
};

type TenantBrandingRow = {
  team_name: string | null;
  slogan: string | null;
  description: string | null;
  logo_url: string | null;
};

export async function getTenantPublicSiteDataBySlug(tenantSlug: string): Promise<TenantPublicSiteData | null> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return null;
  }

  const { data: branding } = await supabase
    .from("tenant_branding")
    .select("team_name, slogan, description, logo_url")
    .eq("tenant_id", tenant.id)
    .maybeSingle<TenantBrandingRow>();

  return {
    tenant,
    branding: {
      team_name: branding?.team_name ?? null,
      slogan: branding?.slogan ?? null,
      description: branding?.description ?? null,
      logo_url: branding?.logo_url ?? null,
    },
  } satisfies TenantPublicSiteData;
}

export async function getTenantMarketingLandingDataByTenantId(tenantId: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantById(supabase, tenantId);

  if (!tenant) {
    return null;
  }

  const { data: branding } = await supabase
    .from("tenant_branding")
    .select("team_name, slogan, description, logo_url")
    .eq("tenant_id", tenant.id)
    .maybeSingle<TenantBrandingRow>();

  return {
    tenant,
    branding: {
      team_name: branding?.team_name ?? null,
      slogan: branding?.slogan ?? null,
      description: branding?.description ?? null,
      logo_url: branding?.logo_url ?? null,
    },
  } satisfies TenantMarketingLandingData;
}

export async function getTenantMarketingLandingDataBySlug(tenantSlug: string) {
  const siteData = await getTenantPublicSiteDataBySlug(tenantSlug);

  if (!siteData) {
    return null;
  }

  return {
    tenant: siteData.tenant,
    branding: siteData.branding,
  } satisfies TenantMarketingLandingData;
}
