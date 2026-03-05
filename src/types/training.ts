export type TeamInfo = {
  name: string;
  logoUrl: string;
  slogan: string;
  description: string;
  coreMessage: string[];
};

export type CoachInfo = {
  name: string;
  imageUrl?: string;
  instagram: string;
  career: string[];
};

export type Philosophy = {
  motivation: string;
  assistMeaning: string;
  goal: string;
  values: string[];
  identity: string;
};

export type Mindset = {
  title: string;
  statement: string;
};

export type TrainingProgramItem = {
  title: string;
  details: string[];
};

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

export type Session = {
  date: string;
  title: string;
  workout?: Workout;
  contentHtml?: string;
};

export type TrainingAppData = {
  teamInfo: TeamInfo;
  coach: CoachInfo;
  philosophy: Philosophy;
  mindset: Mindset;
  benefits: string[];
  trainingProgram: TrainingProgramItem[];
  period: ProgramPeriod;
  sessions: Session[];
  selectedProgramId?: string;
  availablePrograms?: Array<{ id: string; title: string }>;
};
