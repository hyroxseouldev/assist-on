import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildTrainingAppData, type AboutContentRow } from "@/lib/about/content";
import { trainingData } from "@/lib/training/data";
import type { Session, TrainingAppData } from "@/types/training";

type ProgramInfoRow = {
  team_name: string;
  logo_url: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: unknown;
  start_date: string;
  end_date: string;
};

type SessionRow = {
  date: string;
  week: number;
  day: string;
  title: string;
  contentHtml?: string;
};

function mapSession(row: {
  session_date: string;
  week: number;
  day_label: string;
  title: string;
  content_html: string;
}): SessionRow {
  return {
    date: row.session_date,
    week: row.week,
    day: row.day_label,
    title: row.title,
    contentHtml: row.content_html,
  };
}

export async function getTrainingAppDataFromSupabase(): Promise<TrainingAppData> {
  const supabase = await createSupabaseServerClient();

  const aboutPromise = supabase
    .from("about_content")
    .select(
      "id, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement, core_messages, philosophy_values, benefits, training_program"
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<AboutContentRow>();

  const programPromise = supabase
    .from("programs")
    .select("team_name, logo_url, slogan, description, coach_name, coach_instagram, coach_career, start_date, end_date")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramInfoRow>();

  const sessionsPromise = supabase
    .from("sessions")
    .select("session_date, week, day_label, title, content_html")
    .order("session_date", { ascending: true })
    .returns<
      {
        session_date: string;
        week: number;
        day_label: string;
        title: string;
        content_html: string;
      }[]
    >();

  const [aboutRes, programRes, sessionsRes] = await Promise.all([aboutPromise, programPromise, sessionsPromise]);

  if (aboutRes.error || programRes.error || sessionsRes.error) {
    return trainingData;
  }

  const about = aboutRes.data;
  const program = programRes.data;
  if (!about || !program) {
    return trainingData;
  }

  const sessions = (sessionsRes.data ?? []).map(mapSession) as Session[];

  return buildTrainingAppData(program, about, sessions);
}
