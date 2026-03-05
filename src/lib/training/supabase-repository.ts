import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";
import { buildTrainingAppData, type AboutContentRow } from "@/lib/about/content";
import { trainingData } from "@/lib/training/data";
import type { Session, TrainingAppData } from "@/types/training";

type ProgramInfoRow = {
  id: string;
  title: string;
  team_name: string;
  thumbnail_url: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: unknown;
  start_date: string;
  end_date: string;
};

type TenantBrandingRow = {
  team_name: string;
  logo_url: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: unknown;
};

type SessionRow = {
  date: string;
  title: string;
  contentHtml?: string;
};

function mapSession(row: {
  session_date: string;
  title: string;
  content_html: string;
}): SessionRow {
  return {
    date: row.session_date,
    title: row.title,
    contentHtml: row.content_html,
  };
}

export async function getTrainingAppDataFromSupabase(): Promise<TrainingAppData> {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase);

  if (!tenant) {
    return trainingData;
  }

  const aboutPromise = supabase
    .from("about_content")
    .select(
      "id, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement, core_messages, philosophy_values, benefits, training_program"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<AboutContentRow>();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const programsPromise = supabase
    .from("programs")
    .select("id, title, team_name, thumbnail_url, slogan, description, coach_name, coach_instagram, coach_career, start_date, end_date")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: true })
    .returns<ProgramInfoRow[]>();

  const brandingPromise = supabase
    .from("tenant_branding")
    .select("team_name, logo_url, slogan, description, coach_name, coach_instagram, coach_career")
    .eq("tenant_id", tenant.id)
    .maybeSingle<TenantBrandingRow>();

  const userProgramStatePromise = user
    ? supabase
        .from("user_program_states")
        .select("active_program_id")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .maybeSingle<{ active_program_id: string }>()
    : Promise.resolve({ data: null, error: null });

  const entitlementPromise = user
    ? supabase
        .from("program_entitlements")
        .select("program_id")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`)
        .returns<Array<{ program_id: string }>>()
    : Promise.resolve({ data: [] as Array<{ program_id: string }>, error: null });

  const [aboutRes, programsRes, brandingRes, userProgramStateRes, entitlementRes] = await Promise.all([
    aboutPromise,
    programsPromise,
    brandingPromise,
    userProgramStatePromise,
    entitlementPromise,
  ]);

  if (aboutRes.error || programsRes.error || brandingRes.error || userProgramStateRes.error || entitlementRes.error) {
    return trainingData;
  }

  const about = aboutRes.data;
  const programs = programsRes.data ?? [];
  const program = programs[0] ?? null;
  if (!about || !program) {
    return trainingData;
  }

  const entitledProgramIds = new Set((entitlementRes.data ?? []).map((row) => row.program_id));
  const activeProgramIdFromState = userProgramStateRes.data?.active_program_id ?? null;
  const selectablePrograms = programs.filter((row) => {
    if (!user) return true;
    if (entitledProgramIds.size === 0) return true;
    return entitledProgramIds.has(row.id);
  });

  const selectedProgram =
    selectablePrograms.find((row) => row.id === activeProgramIdFromState) ??
    selectablePrograms[0] ??
    programs[0];

  const sessionsRes = await supabase
    .from("sessions")
    .select("session_date, title, content_html")
    .eq("tenant_id", tenant.id)
    .eq("program_id", selectedProgram.id)
    .order("session_date", { ascending: true })
    .returns<
      {
        session_date: string;
        title: string;
        content_html: string;
      }[]
    >();

  if (sessionsRes.error) {
    return trainingData;
  }

  const sessions = (sessionsRes.data ?? []).map(mapSession) as Session[];

  const branding = brandingRes.data;
  const programForDisplay = {
    team_name: branding?.team_name || program.team_name,
    logo_url: branding?.logo_url || program.thumbnail_url,
    slogan: branding?.slogan || program.slogan,
    description: branding?.description || program.description,
    coach_name: branding?.coach_name || program.coach_name,
    coach_instagram: branding?.coach_instagram || program.coach_instagram,
    coach_career: branding?.coach_career || program.coach_career,
    start_date: selectedProgram.start_date,
    end_date: selectedProgram.end_date,
  };

  const appData = buildTrainingAppData(programForDisplay, about, sessions);

  return {
    ...appData,
    selectedProgramId: selectedProgram.id,
    availablePrograms: selectablePrograms.map((item) => ({
      id: item.id,
      title: item.title?.trim() || item.slogan || item.team_name,
    })),
  };
}
