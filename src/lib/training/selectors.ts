import type { Session, TrainingAppData } from "@/types/training";

export function getSessionByDate(data: TrainingAppData, dateKey: string): Session | null {
  return data.sessions.find((session) => session.date === dateKey) ?? null;
}

export function createSessionMap(data: TrainingAppData) {
  return new Map(data.sessions.map((session) => [session.date, session]));
}
