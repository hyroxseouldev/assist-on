import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminRole,
  ProgramContentRow,
  ProgramRow,
  SectionDetailRow,
  SectionRow,
  SessionRow,
} from "@/lib/admin/types";

export async function requireAdminUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: AdminRole }>();

  return {
    supabase,
    user,
    isAdmin: profile?.role === "admin",
  };
}

export async function getPrimaryProgram(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const programRes = await supabase
    .from("programs")
    .select(
      "id, team_name, slogan, description, coach_name, coach_instagram, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement, start_date, end_date"
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramRow>();

  return programRes.data ?? null;
}

export async function getProgramContentRows(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, programId: string) {
  const { data } = await supabase
    .from("program_content")
    .select("id, type, order_index, content")
    .eq("program_id", programId)
    .order("type", { ascending: true })
    .order("order_index", { ascending: true })
    .returns<ProgramContentRow[]>();

  return data ?? [];
}

export async function getTrainingSectionsAndDetails(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  programId: string
) {
  const [sectionsRes, detailsRes] = await Promise.all([
    supabase
      .from("training_program_sections")
      .select("id, title, order_index")
      .eq("program_id", programId)
      .order("order_index", { ascending: true })
      .returns<SectionRow[]>(),
    supabase
      .from("training_program_section_details")
      .select("id, section_id, detail, order_index")
      .order("order_index", { ascending: true })
      .returns<SectionDetailRow[]>(),
  ]);

  return {
    sections: sectionsRes.data ?? [],
    sectionDetails: detailsRes.data ?? [],
  };
}

export async function getSessions(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, programId: string) {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, week, day_label, title, warmup, main_set")
    .eq("program_id", programId)
    .order("session_date", { ascending: true })
    .returns<SessionRow[]>();

  return data ?? [];
}
