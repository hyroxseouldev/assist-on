import { redirect } from "next/navigation";

import { aboutToEditorData, programToEditorData, type AboutContentRow } from "@/lib/about/content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdminRole,
  NoticeRow,
  OfflineClassRegistrationRow,
  OfflineClassRow,
  OfflineClassWithParticipants,
  ProgramRow,
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

export async function getAdminNotices(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, is_published, created_at, updated_at")
    .order("created_at", { ascending: false })
    .returns<NoticeRow[]>();

  return data ?? [];
}

export async function getPublishedNotices(limit?: number) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("notices")
    .select("id, title, content_html, is_published, created_at, updated_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data } = await query.returns<NoticeRow[]>();
  return data ?? [];
}

function attachOfflineClassParticipants(
  classes: OfflineClassRow[],
  registrations: OfflineClassRegistrationRow[]
): OfflineClassWithParticipants[] {
  const registrationByClassId = new Map<string, OfflineClassRegistrationRow[]>();

  registrations.forEach((registration) => {
    const rows = registrationByClassId.get(registration.class_id) ?? [];
    rows.push(registration);
    registrationByClassId.set(registration.class_id, rows);
  });

  return classes.map((offlineClass) => ({
    ...offlineClass,
    participants: registrationByClassId.get(offlineClass.id) ?? [],
  }));
}

export async function getPublishedOfflineClasses({
  limit,
  upcomingOnly = false,
}: {
  limit?: number;
  upcomingOnly?: boolean;
} = {}) {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("offline_classes")
    .select("id, title, content_html, location_text, starts_at, ends_at, capacity, is_published, created_by, created_at, updated_at")
    .eq("is_published", true)
    .order("starts_at", { ascending: true });

  if (upcomingOnly) {
    query = query.gt("starts_at", new Date().toISOString());
  }

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data: classes } = await query.returns<OfflineClassRow[]>();
  const classRows = classes ?? [];

  const classIds = classRows.map((row) => row.id);
  if (classIds.length === 0) {
    return { classes: [] as OfflineClassWithParticipants[], currentUserId: null as string | null };
  }

  const [{ data: registrations }, userRes] = await Promise.all([
    supabase
      .from("offline_class_registrations")
      .select("id, class_id, user_id, participant_name, created_at")
      .in("class_id", classIds)
      .order("created_at", { ascending: true })
      .returns<OfflineClassRegistrationRow[]>(),
    supabase.auth.getUser(),
  ]);

  const currentUserId = userRes.data.user?.id ?? null;

  return {
    classes: attachOfflineClassParticipants(classRows, registrations ?? []),
    currentUserId,
  };
}

export async function getAdminOfflineClasses(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: classes } = await supabase
    .from("offline_classes")
    .select("id, title, content_html, location_text, starts_at, ends_at, capacity, is_published, created_by, created_at, updated_at")
    .order("starts_at", { ascending: true })
    .returns<OfflineClassRow[]>();

  const classRows = classes ?? [];
  const classIds = classRows.map((row) => row.id);
  if (classIds.length === 0) {
    return [] as OfflineClassWithParticipants[];
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, created_at")
    .in("class_id", classIds)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  return attachOfflineClassParticipants(classRows, registrations ?? []);
}

export async function getAdminOfflineClassById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string
) {
  const { data: offlineClass } = await supabase
    .from("offline_classes")
    .select("id, title, content_html, location_text, starts_at, ends_at, capacity, is_published, created_by, created_at, updated_at")
    .eq("id", id)
    .maybeSingle<OfflineClassRow>();

  if (!offlineClass) {
    return null;
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, created_at")
    .eq("class_id", id)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  const [withParticipants] = attachOfflineClassParticipants([offlineClass], registrations ?? []);
  return withParticipants;
}
