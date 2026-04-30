export type ProgramPeriod = {
  startDate: string;
  endDate: string;
};

export type WarmupRunning = {
  type: "running";
  paces: string[];
};

export type MainSetRunning = {
  type: "running";
  distance: string;
  pace: string;
  repetitions: number;
};

export type Workout = {
  warmup: WarmupRunning;
  mainSet: MainSetRunning;
};

export type SessionType = "training" | "rest";

export type Session = {
  date: string;
  title: string;
  workout?: Workout;
  contentHtml?: string;
  sessionType?: SessionType;
};
