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

  const { data, error } = await supabase
    .from("programs")
    .select("team_name, thumbnail_url")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ team_name: string | null; thumbnail_url: string | null }>();

  if (error || !data) {
    return {
      teamName: DEFAULT_TEAM_NAME,
      logoUrl: DEFAULT_LOGO_URL,
    };
  }

  return {
    teamName: data.team_name?.trim() || DEFAULT_TEAM_NAME,
    logoUrl: data.thumbnail_url?.trim() || DEFAULT_LOGO_URL,
  };
}
