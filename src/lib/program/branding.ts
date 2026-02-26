import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_TEAM_NAME = "Assist On";
const DEFAULT_LOGO_URL = "/xon_logo.jpg";

type ProgramBranding = {
  teamName: string;
  logoUrl: string;
};

export async function getPrimaryProgramBranding(): Promise<ProgramBranding> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("programs")
    .select("team_name, logo_url")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ team_name: string | null; logo_url: string | null }>();

  if (error || !data) {
    return {
      teamName: DEFAULT_TEAM_NAME,
      logoUrl: DEFAULT_LOGO_URL,
    };
  }

  return {
    teamName: data.team_name?.trim() || DEFAULT_TEAM_NAME,
    logoUrl: data.logo_url?.trim() || DEFAULT_LOGO_URL,
  };
}
