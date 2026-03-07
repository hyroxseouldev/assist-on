export type TenantMembershipRole = "owner" | "coach" | "member";
export type ProgramDifficulty = "beginner" | "intermediate" | "advanced";
export type SessionType = "training" | "rest";

export type ManagedUserProgramEntitlement = {
  program_id: string;
  program_title: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type ManagedUserRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  account_status?: "active" | "deactivated";
  deactivated_at?: string | null;
  role: TenantMembershipRole;
  has_membership?: boolean;
  email_confirmed: boolean;
  invited_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  active_program_id?: string | null;
  program_entitlements?: ManagedUserProgramEntitlement[];
};

export type ManagedUserSortBy = "created_at" | "last_sign_in_at" | "full_name";

export type SortOrder = "asc" | "desc";

export type ManagedUsersPage = {
  items: ManagedUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminDeactivatedAccountRow = {
  id: string;
  email: string;
  full_name: string;
  role: TenantMembershipRole;
  deactivated_at: string;
  last_sign_in_at: string | null;
};

export type AdminWorkoutExerciseOption = {
  exercise_key: string;
  record_type: "time" | "weight";
  sort_order: number;
};

export type AdminWorkoutPresetOption = {
  exercise_key: string;
  preset_key: string;
  distance_m: number | null;
  target_reps: number | null;
  sort_order: number;
};

export type AdminWorkoutLeaderboardItem = {
  rank: number;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  record_type: "time" | "weight";
  best_seconds: number | null;
  best_weight_kg: number | null;
  record_reps: number | null;
  distance_m: number | null;
  preset_key: string | null;
  latest_recorded_at: string;
};

export type AdminUserWorkoutRecordRow = {
  id: string;
  exercise_key: string;
  record_type: "time" | "weight";
  preset_key: string | null;
  distance: number | null;
  record_seconds: number | null;
  record_weight_kg: number | null;
  record_reps: number | null;
  recorded_at: string;
};

export type AdminWorkoutLeaderboardPage = {
  exerciseOptions: AdminWorkoutExerciseOption[];
  presetOptions: AdminWorkoutPresetOption[];
  selectedExerciseKey: string;
  selectedPresetKey: string;
  items: AdminWorkoutLeaderboardItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ProgramRow = {
  id: string;
  team_name: string;
  thumbnail_url: string;
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
  logo_url: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: string[];
  start_date: string;
  end_date: string;
};

export type TenantBrandingEditorData = {
  tenant_id: string;
  team_name: string;
  logo_url: string;
  coach_image_url: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: string[];
};

export type AdminProgramListRow = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  difficulty: ProgramDifficulty;
  daily_workout_minutes: number;
  days_per_week: number;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type AdminProgramProductRow = {
  id: string;
  tenant_id: string;
  program_id: string;
  price_krw: number;
  sale_status: "active" | "preparing" | "private";
  is_active: boolean;
  sale_type: "one_time" | "subscription";
  billing_interval: "monthly" | null;
  billing_anchor_day: number | null;
  subscription_grace_days: number;
  program_title: string;
  thumbnail_urls: string[];
  content_html: string;
};

export type AdminProgramOrderRow = {
  id: string;
  provider_order_id: string;
  buyer_user_id: string;
  buyer_name: string;
  product_title: string;
  amount_krw: number;
  status: string;
  paid_at: string | null;
  created_at: string;
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
  title: string;
  content_html: string | null;
  is_published: boolean;
  publish_at: string | null;
  session_type: SessionType;
};

export type NoticeRow = {
  id: string;
  title: string;
  content_html: string;
  thumbnail_url: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type OfflineClassRow = {
  id: string;
  title: string;
  content_html: string;
  location_text: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type OfflineClassRegistrationRow = {
  id: string;
  class_id: string;
  user_id: string;
  participant_name: string;
  created_at: string;
};

export type OfflineClassWithParticipants = OfflineClassRow & {
  participants: OfflineClassRegistrationRow[];
};

export type CommunityReportStatus = "open" | "resolved" | "rejected";
export type CommunityPostStatus = "published" | "hidden" | "deleted";

export type AdminCommunityPostRow = {
  id: string;
  title: string;
  content_html?: string;
  images?: string[];
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  status: CommunityPostStatus;
  created_at: string;
  like_count: number;
  comment_count: number;
};

export type AdminCommunityReportRow = {
  id: string;
  post_id: string;
  post_title: string;
  post_content_html?: string | null;
  post_status?: CommunityPostStatus;
  reporter_id: string;
  reporter_name: string;
  reason: string;
  status: CommunityReportStatus;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type AdminCommunityPostsPage = {
  items: AdminCommunityPostRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminCommunityReportsPage = {
  items: AdminCommunityReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type LegalDocumentType = "terms_of_service" | "privacy_policy";
export type LegalDocumentLocale = "ko" | "en";

export type AdminLegalDocumentRow = {
  id: string;
  type: LegalDocumentType;
  locale: LegalDocumentLocale;
  title: string;
  version: string;
  is_published: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};
