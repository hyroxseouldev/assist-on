export type AdminRole = "user" | "admin";

export type ProgramRow = {
  id: string;
  team_name: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: string[];
  motivation: string;
  assist_meaning: string;
  goal: string;
  identity: string;
  mindset_title: string;
  mindset_statement: string;
  start_date: string;
  end_date: string;
};

export type AboutEditorTrainingItem = {
  title: string;
  details: string[];
};

export type ProgramInfoEditorData = {
  id: string;
  team_name: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: string[];
  start_date: string;
  end_date: string;
};

export type AboutEditorData = {
  id: string;
  motivation: string;
  assist_meaning: string;
  goal: string;
  identity: string;
  mindset_title: string;
  mindset_statement: string;
  core_messages: string[];
  philosophy_values: string[];
  benefits: string[];
  training_program: AboutEditorTrainingItem[];
};

export type ProgramContentType = "core_message" | "philosophy_value" | "benefit";

export type ProgramContentRow = {
  id: string;
  type: ProgramContentType;
  order_index: number;
  content: string;
};

export type SectionRow = {
  id: string;
  title: string;
  order_index: number;
};

export type SectionDetailRow = {
  id: string;
  section_id: string;
  detail: string;
  order_index: number;
};

export type SessionRow = {
  id: string;
  session_date: string;
  week: number;
  day_label: string;
  title: string;
  content_html: string | null;
};

export type NoticeRow = {
  id: string;
  title: string;
  content_html: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};
