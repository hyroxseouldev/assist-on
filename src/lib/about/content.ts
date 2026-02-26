import type { AboutEditorData, ProgramInfoEditorData } from "@/lib/admin/types";
import type { TrainingAppData, TrainingProgramItem } from "@/types/training";

export type AboutContentRow = {
  id: string;
  motivation: string;
  goal: string;
  identity: string;
  assist_meaning: string;
  mindset_title: string;
  mindset_statement: string;
  core_messages: unknown;
  philosophy_values: unknown;
  benefits: unknown;
  training_program: unknown;
};

type AboutTrainingProgramItem = {
  title: string;
  details: string[];
};

function toSafeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => toSafeString(item))
    .filter((item) => item.length > 0);
}

export function parseTrainingProgram(value: unknown): AboutTrainingProgramItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const title = toSafeString(record.title);
      if (!title) return null;

      return {
        title,
        details: parseStringArray(record.details),
      };
    })
    .filter((item): item is AboutTrainingProgramItem => Boolean(item));
}

export function aboutToEditorData(about: AboutContentRow): AboutEditorData {
  return {
    id: about.id,
    motivation: toSafeString(about.motivation),
    assist_meaning: toSafeString(about.assist_meaning),
    goal: toSafeString(about.goal),
    identity: toSafeString(about.identity),
    mindset_title: toSafeString(about.mindset_title),
    mindset_statement: toSafeString(about.mindset_statement),
    core_messages: parseStringArray(about.core_messages),
    philosophy_values: parseStringArray(about.philosophy_values),
    benefits: parseStringArray(about.benefits),
    training_program: parseTrainingProgram(about.training_program),
  };
}

export function programToEditorData(program: {
  id: string;
  team_name: unknown;
  logo_url: unknown;
  slogan: unknown;
  description: unknown;
  coach_name: unknown;
  coach_instagram: unknown;
  coach_career: unknown;
  start_date: string;
  end_date: string;
}): ProgramInfoEditorData {
  return {
    id: program.id,
    team_name: toSafeString(program.team_name),
    logo_url: toSafeString(program.logo_url),
    slogan: toSafeString(program.slogan),
    description: toSafeString(program.description),
    coach_name: toSafeString(program.coach_name),
    coach_instagram: toSafeString(program.coach_instagram),
    coach_career: parseStringArray(program.coach_career),
    start_date: program.start_date,
    end_date: program.end_date,
  };
}

export function buildTrainingAppData(
  program: {
    team_name: unknown;
    logo_url: unknown;
    slogan: unknown;
    description: unknown;
    coach_name: unknown;
    coach_instagram: unknown;
    coach_career: unknown;
    start_date: string;
    end_date: string;
  },
  about: AboutContentRow,
  sessions: TrainingAppData["sessions"]
): TrainingAppData {
  const trainingProgram = parseTrainingProgram(about.training_program);

  return {
    teamInfo: {
      name: toSafeString(program.team_name),
      logoUrl: toSafeString(program.logo_url) || "/xon_logo.jpg",
      slogan: toSafeString(program.slogan),
      description: toSafeString(program.description),
      coreMessage: parseStringArray(about.core_messages),
    },
    coach: {
      name: toSafeString(program.coach_name),
      instagram: toSafeString(program.coach_instagram),
      career: parseStringArray(program.coach_career),
    },
    philosophy: {
      motivation: toSafeString(about.motivation),
      assistMeaning: toSafeString(about.assist_meaning),
      goal: toSafeString(about.goal),
      values: parseStringArray(about.philosophy_values),
      identity: toSafeString(about.identity),
    },
    mindset: {
      title: toSafeString(about.mindset_title),
      statement: toSafeString(about.mindset_statement),
    },
    benefits: parseStringArray(about.benefits),
    trainingProgram: trainingProgram as TrainingProgramItem[],
    period: {
      startDate: program.start_date,
      endDate: program.end_date,
    },
    sessions,
  };
}
