import { redirect } from "next/navigation";

import {
  aboutToEditorData,
  aboutToProgramContentRows,
  aboutToTrainingRows,
  programToEditorData,
  type AboutContentRow,
} from "@/lib/about/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminRole,
  AboutEditorData,
  ProgramInfoEditorData,
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
      "id, team_name, slogan, description, coach_name, coach_instagram, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement, start_date, end_date, coach_career"
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramRow>();

  return programRes.data ?? null;
}

export async function getProgramContentRows(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, programId: string) {
  const { data } = await supabase
    .from("about_content")
    .select("id, core_messages, coach_career, philosophy_values, benefits")
    .eq("id", programId)
    .maybeSingle<AboutContentRow>();

  if (!data) {
    return [];
  }

  return aboutToProgramContentRows(data);
}

export async function getTrainingSectionsAndDetails(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  programId: string
) {
  const { data } = await supabase
    .from("about_content")
    .select("id, training_program")
    .eq("id", programId)
    .maybeSingle<AboutContentRow>();

  if (!data) {
    return {
      sections: [] as SectionRow[],
      sectionDetails: [] as SectionDetailRow[],
    };
  }

  const { sections, sectionDetails } = aboutToTrainingRows(data);

  return {
    sections,
    sectionDetails,
  };
}

export async function getPrimarySessionProgramId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await supabase
    .from("programs")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function getAboutEditorData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: about } = await supabase
    .from("about_content")
    .select(
      "id, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement, core_messages, philosophy_values, benefits, training_program"
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<AboutContentRow>();

  if (!about) {
    return null;
  }

  return aboutToEditorData(about) as AboutEditorData;
}

export async function getProgramInfoEditorData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: program } = await supabase
    .from("programs")
    .select("id, team_name, slogan, description, coach_name, coach_instagram, coach_career, start_date, end_date")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramRow>();

  if (!program) {
    return null;
  }

  return programToEditorData(program) as ProgramInfoEditorData;
}

export async function getSessions(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, programId: string) {
  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, week, day_label, title, content_html")
    .eq("program_id", programId)
    .order("session_date", { ascending: true })
    .returns<SessionRow[]>();

  return data ?? [];
}
