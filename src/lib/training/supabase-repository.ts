import { createSupabaseServerClient } from "@/lib/supabase/server";
import { trainingData } from "@/lib/training/data";
import type { Session, TrainingAppData, TrainingProgramItem } from "@/types/training";

type ProgramRow = {
  id: string;
  team_name: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  motivation: string;
  assist_meaning: string;
  goal: string;
  identity: string;
  mindset_title: string;
  mindset_statement: string;
  start_date: string;
  end_date: string;
};

type ProgramContentRow = {
  type: "core_message" | "coach_career" | "philosophy_value" | "benefit";
  order_index: number;
  content: string;
};

type TrainingSectionRow = {
  id: string;
  title: string;
  order_index: number;
};

type TrainingSectionDetailRow = {
  section_id: string;
  detail: string;
  order_index: number;
};

type SessionRow = {
  date: string;
  week: number;
  day: string;
  title: string;
  contentHtml?: string;
};

function byOrderAsc<T extends { order_index: number }>(a: T, b: T) {
  return a.order_index - b.order_index;
}

function mapSections(
  sections: TrainingSectionRow[],
  details: TrainingSectionDetailRow[]
): TrainingProgramItem[] {
  const detailsBySection = new Map<string, TrainingSectionDetailRow[]>();

  details.forEach((detail) => {
    const prev = detailsBySection.get(detail.section_id) ?? [];
    prev.push(detail);
    detailsBySection.set(detail.section_id, prev);
  });

  return sections
    .toSorted(byOrderAsc)
    .map((section) => ({
      title: section.title,
      details: (detailsBySection.get(section.id) ?? []).toSorted(byOrderAsc).map((detail) => detail.detail),
    }));
}

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

  const programPromise = supabase
    .from("programs")
    .select(
      "id, team_name, slogan, description, coach_name, coach_instagram, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement, start_date, end_date"
    )
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramRow>();

  const programContentPromise = supabase
    .from("program_content")
    .select("type, order_index, content")
    .order("order_index", { ascending: true })
    .returns<ProgramContentRow[]>();

  const sectionsPromise = supabase
    .from("training_program_sections")
    .select("id, title, order_index")
    .order("order_index", { ascending: true })
    .returns<TrainingSectionRow[]>();

  const sectionDetailsPromise = supabase
    .from("training_program_section_details")
    .select("section_id, detail, order_index")
    .order("order_index", { ascending: true })
    .returns<TrainingSectionDetailRow[]>();

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

  const [programRes, contentRes, sectionsRes, detailsRes, sessionsRes] = await Promise.all([
    programPromise,
    programContentPromise,
    sectionsPromise,
    sectionDetailsPromise,
    sessionsPromise,
  ]);

  if (programRes.error || contentRes.error || sectionsRes.error || detailsRes.error || sessionsRes.error) {
    return trainingData;
  }

  const program = programRes.data;
  if (!program) {
    return trainingData;
  }

  const contentRows = contentRes.data ?? [];
  const sections = sectionsRes.data ?? [];
  const details = detailsRes.data ?? [];
  const sessions = (sessionsRes.data ?? []).map(mapSession) as Session[];

  const byType = (type: ProgramContentRow["type"]) =>
    contentRows
      .filter((item) => item.type === type)
      .toSorted(byOrderAsc)
      .map((item) => item.content);

  return {
    teamInfo: {
      name: program.team_name,
      slogan: program.slogan,
      description: program.description,
      coreMessage: byType("core_message"),
    },
    coach: {
      name: program.coach_name,
      instagram: program.coach_instagram,
      career: byType("coach_career"),
    },
    philosophy: {
      motivation: program.motivation,
      assistMeaning: program.assist_meaning,
      goal: program.goal,
      values: byType("philosophy_value"),
      identity: program.identity,
    },
    mindset: {
      title: program.mindset_title,
      statement: program.mindset_statement,
    },
    benefits: byType("benefit"),
    trainingProgram: mapSections(sections, details),
    period: {
      startDate: program.start_date,
      endDate: program.end_date,
    },
    sessions,
  };
}
