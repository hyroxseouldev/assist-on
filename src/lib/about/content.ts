import type { ProgramInfoEditorData } from "@/lib/admin/types";

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

export function programToEditorData(program: {
  id: string;
  team_name: unknown;
  thumbnail_url: unknown;
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
    logo_url: toSafeString(program.thumbnail_url),
    slogan: toSafeString(program.slogan),
    description: toSafeString(program.description),
    coach_name: toSafeString(program.coach_name),
    coach_instagram: toSafeString(program.coach_instagram),
    coach_career: parseStringArray(program.coach_career),
    start_date: program.start_date,
    end_date: program.end_date,
  };
}
