import type { Session, TrainingAppData } from "@/types/training";

export interface TrainingRepository {
  getTrainingAppData(): Promise<TrainingAppData>;
  getSessionByDate(dateKey: string): Promise<Session | null>;
}
