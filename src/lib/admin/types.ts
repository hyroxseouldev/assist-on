export type AdminRole = "user" | "admin";
export type TenantMembershipRole = "owner" | "coach" | "member";

export type ManagedUserRow = {
  id: string;
  email: string;
  full_name: string;
  role: TenantMembershipRole;
  email_confirmed: boolean;
  invited_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
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

export type ProgramRow = {
  id: string;
  team_name: string;
  logo_url: string;
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
  author_id: string;
  author_name: string;
  status: CommunityPostStatus;
  created_at: string;
  like_count: number;
  comment_count: number;
};

export type AdminCommunityReportRow = {
  id: string;
  post_id: string;
  post_title: string;
  reporter_id: string;
  reporter_name: string;
  reason: string;
  status: CommunityReportStatus;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type TenantInvitationRow = {
  id: string;
  role: TenantMembershipRole;
  max_uses: number;
  used_count: number;
  expires_at: string;
  created_at: string;
};
