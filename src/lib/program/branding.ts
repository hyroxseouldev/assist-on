import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

const DEFAULT_TEAM_NAME = "Assist On";
const DEFAULT_LOGO_URL = "/logo.png";

type ProgramBranding = {
  teamName: string;
  logoUrl: string;
};

async function getProgramBrandingByTenantSlug(tenantSlug?: string): Promise<ProgramBranding> {
  if (!tenantSlug) {
    return {
      teamName: DEFAULT_TEAM_NAME,
      logoUrl: DEFAULT_LOGO_URL,
    };
  }

  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return {
      teamName: DEFAULT_TEAM_NAME,
      logoUrl: DEFAULT_LOGO_URL,
    };
  }

  const [programRes, tenantBrandingRes] = await Promise.all([
    supabase
      .from("programs")
      .select("team_name, thumbnail_url")
      .eq("tenant_id", tenant.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ team_name: string | null; thumbnail_url: string | null }>(),
    supabase
      .from("tenant_branding")
      .select("team_name, logo_url")
      .eq("tenant_id", tenant.id)
      .maybeSingle<{ team_name: string | null; logo_url: string | null }>(),
  ]);

  const program = programRes.data;
  const tenantBranding = tenantBrandingRes.data;

  if (!program && !tenantBranding) {
    return {
      teamName: DEFAULT_TEAM_NAME,
      logoUrl: DEFAULT_LOGO_URL,
    };
  }

  return {
    teamName: tenantBranding?.team_name?.trim() || tenant.name.trim() || DEFAULT_TEAM_NAME,
    logoUrl: tenantBranding?.logo_url?.trim() || DEFAULT_LOGO_URL,
  };
}

export async function getPrimaryProgramBranding(): Promise<ProgramBranding> {
  return getProgramBrandingByTenantSlug();
}

export async function getPrimaryProgramBrandingForTenant(tenantSlug?: string): Promise<ProgramBranding> {
  return getProgramBrandingByTenantSlug(tenantSlug);
}
