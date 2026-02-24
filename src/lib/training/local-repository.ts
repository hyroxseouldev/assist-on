import { trainingData } from "@/lib/training/data";
import { createSessionMap } from "@/lib/training/selectors";
import type { TrainingRepository } from "@/lib/training/repository";

const sessionMap = createSessionMap(trainingData);

export class LocalTrainingRepository implements TrainingRepository {
  async getTrainingAppData() {
    return trainingData;
  }

  async getSessionByDate(dateKey: string) {
    return sessionMap.get(dateKey) ?? null;
  }
}
