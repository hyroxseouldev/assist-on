import { redirect } from "next/navigation";

import { aboutToEditorData, programToEditorData, type AboutContentRow } from "@/lib/about/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminRole, ProgramRow, SessionRow } from "@/lib/admin/types";

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

  return aboutToEditorData(about);
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

  return programToEditorData(program);
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
