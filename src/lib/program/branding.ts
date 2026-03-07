import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

const DEFAULT_TEAM_NAME = "Assist On";
const DEFAULT_LOGO_URL = "/xon_logo.jpg";

type ProgramBranding = {
  teamName: string;
  logoUrl: string;
};

export async function getPrimaryProgramBranding(): Promise<ProgramBranding> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase);

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
    teamName: tenantBranding?.team_name?.trim() || program?.team_name?.trim() || DEFAULT_TEAM_NAME,
    logoUrl: tenantBranding?.logo_url?.trim() || program?.thumbnail_url?.trim() || DEFAULT_LOGO_URL,
  };
}
