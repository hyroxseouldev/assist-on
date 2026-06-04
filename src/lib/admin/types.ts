import type { ProfileGender } from "@/lib/profile/gender";

export type TenantMembershipRole = "owner" | "coach" | "member";
export type ProgramDifficulty = "beginner" | "intermediate" | "advanced";
export type ProgramMobileVisibility = "public" | "members_only" | "private";
export type ProgramDeliveryMode = "fixed_date" | "cohort_based";
export type ProgramApplicationStatus = "pending" | "approved" | "rejected" | "canceled";
export type SessionType = "training" | "rest";
export type BookingSlotStatus = "open" | "pending" | "booked" | "blocked" | "closed";
export type BookingReservationStatus = "requested" | "confirmed" | "rejected" | "canceled" | "completed" | "no_show" | "expired";

export type ManagedUserProgramEntitlement = {
  id: string;
  program_id: string;
  program_title: string;
  cohort_id: string | null;
  cohort_name: string | null;
  cohort_starts_on: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type ManagedUserRow = {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  avatar_url?: string | null;
  gender: ProfileGender | null;
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

export type AdminTenantUserCandidate = {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  already_member: boolean;
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

export type AdminMembershipStatus = "active" | "pending" | "expired" | "inactive";
export type AdminMembershipStatusFilter = AdminMembershipStatus | "all";

export type AdminMembershipRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone_number: string | null;
  program_id: string;
  program_title: string;
  cohort_id: string | null;
  cohort_name: string | null;
  cohort_starts_on: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  status: AdminMembershipStatus;
  is_current_program: boolean;
  created_at: string;
};

export type AdminMembershipsPage = {
  items: AdminMembershipRow[];
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
  selectedGender: ProfileGender | "all";
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
  start_date: string;
  end_date: string;
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
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  bank_deposit_guide: string;
  slogan: string;
  description: string;
  coach_name: string;
  coach_instagram: string;
  coach_career: string[];
};

export type AdminProgramListRow = {
  id: string;
  display_order: number;
  title: string;
  description: string;
  thumbnail_url: string;
  mobile_visibility: ProgramMobileVisibility;
  difficulty: ProgramDifficulty;
  daily_workout_minutes: number;
  days_per_week: number;
  delivery_mode: ProgramDeliveryMode;
  content_starts_on: string | null;
  content_ends_on: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type AdminProgramCohortRow = {
  id: string;
  tenant_id: string;
  program_id: string;
  name: string;
  starts_on: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminProgramCoachOption = {
  id: string;
  user_id: string;
  display_name: string;
  instagram: string;
  image_url: string;
  is_active: boolean;
};

export type AdminProgramEditorRow = AdminProgramListRow & {
  available_coaches: AdminProgramCoachOption[];
  selected_coach_profile_ids: string[];
  primary_coach_profile_id: string | null;
  cohorts: AdminProgramCohortRow[];
};

export type AdminCoachProfileCandidate = {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: TenantMembershipRole;
};

export type AdminCoachProfileRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  display_name: string;
  instagram: string;
  introduction: string;
  career: string[];
  image_url: string;
  additional_image_urls: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_role: TenantMembershipRole;
  member_full_name: string;
  member_email: string;
  member_avatar_url: string | null;
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
  duration_options: Array<{
    duration_months: 1 | 2 | 3 | 6;
    price_krw: number;
    is_enabled: boolean;
  }>;
  program_title: string;
  thumbnail_urls: string[];
  intro_image_url: string;
  content_html: string;
};

export type AdminProgramProductsPage = {
  items: AdminProgramProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminProgramOrderRow = {
  id: string;
  provider_order_id: string;
  buyer_user_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  depositor_name: string;
  payment_method: string | null;
  product_title: string;
  duration_months: 1 | 2 | 3 | 6 | null;
  amount_krw: number;
  status: string;
  paid_at: string | null;
  created_at: string;
};

export type AdminProgramOrderFilter = "all" | "bank_pending" | "bank_paid" | "toss";

export type AdminProgramOrdersPage = {
  items: AdminProgramOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminProgramOrderFilter;
};

export type GuestOrderStatus = "pending" | "confirmed" | "canceled";

export type AdminGuestOrderFilter = "all" | GuestOrderStatus;

export type AdminGuestOrderRow = {
  id: string;
  status: GuestOrderStatus;
  buyer_name: string;
  buyer_phone: string;
  order_payload: Record<string, unknown>;
  created_at: string;
  confirmed_at: string | null;
  canceled_at: string | null;
};

export type AdminGuestOrdersPage = {
  items: AdminGuestOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminGuestOrderFilter;
  month: string;
};

export type AdminGuestOrderRevenueRange = "6" | "12" | "24" | "all";

export type AdminGuestOrderRevenueMonth = {
  month: string;
  label: string;
  revenue_krw: number;
  confirmed_order_count: number;
  average_order_amount_krw: number;
};

export type AdminGuestOrderRevenueSummary = {
  total_revenue_krw: number;
  confirmed_order_count: number;
  monthly_average_revenue_krw: number;
  average_order_amount_krw: number;
};

export type AdminGuestOrderRevenuePage = {
  range: AdminGuestOrderRevenueRange;
  items: AdminGuestOrderRevenueMonth[];
  summary: AdminGuestOrderRevenueSummary;
};

export type AdminProgramApplicationRow = {
  id: string;
  program_id: string;
  program_title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: ProgramApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type AdminProgramApplicationFilter = ProgramApplicationStatus | "all";

export type AdminProgramApplicationsPage = {
  items: AdminProgramApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminProgramApplicationFilter;
};

export type AdminProgramsPage = {
  items: AdminProgramListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export type AdminNoticesPage = {
  items: NoticeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
  thumbnail_url: string | null;
  mobile_visibility: "public" | "private";
  coach_profile_id: string | null;
  coach_profile: {
    id: string;
    display_name: string;
    image_url: string;
  } | null;
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

export type AdminCommunityCommentRow = {
  id: string;
  post_id: string;
  content_html: string;
  status: CommunityPostStatus;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string | null;
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

export type ProgramSessionReviewStatus = "submitted" | "reviewed";

export type AdminProgramSessionReviewRow = {
  id: string;
  program_id: string;
  program_title: string;
  session_id: string;
  session_date: string;
  session_title: string;
  session_type: SessionType;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  completion_note: string;
  status: ProgramSessionReviewStatus;
  coach_feedback: string;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminProgramSessionReviewsPage = {
  items: AdminProgramSessionReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminProgramSessionReviewDateSummary = {
  date: string;
  totalCount: number;
  submittedCount: number;
  reviewedCount: number;
};

export type AdminProgramSessionReviewsCalendarData = {
  items: AdminProgramSessionReviewRow[];
  summaries: AdminProgramSessionReviewDateSummary[];
  selectedDate: string;
  rangeStart: string;
  rangeEnd: string;
};

export type LegalDocumentType = "terms_of_service" | "privacy_policy" | "electronic_commerce_terms";
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

export type AdminLegalDocumentsPage = {
  items: AdminLegalDocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminBookingServiceOptionRow = {
  id: string;
  booking_service_id: string;
  name: string;
  description: string;
  price_krw: number;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminBookingSlotRow = {
  id: string;
  tenant_id: string;
  booking_service_id: string;
  slot_date: string;
  starts_at: string;
  ends_at: string;
  duration_minutes: 60 | 90;
  status: BookingSlotStatus;
  created_at: string;
  updated_at: string;
};

export type AdminBookingServiceRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  is_active: boolean;
  pending_hold_minutes: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  options: AdminBookingServiceOptionRow[];
  upcoming_slots: AdminBookingSlotRow[];
};

export type AdminBookingServiceListRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  option_count: number;
  active_slot_count: number;
};

export type AdminBookingServicesPage = {
  items: AdminBookingServiceListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminBookingReservationRow = {
  id: string;
  tenant_id: string;
  booking_service_id: string;
  slot_id: string;
  user_id: string | null;
  booking_option_id: string;
  price_krw: number;
  status: BookingReservationStatus;
  booker_name: string;
  booker_phone: string;
  user_memo: string;
  admin_memo: string;
  pending_expires_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  canceled_at: string | null;
  canceled_by: string | null;
  created_at: string;
  updated_at: string;
  service_name: string;
  option_name: string;
  slot_starts_at: string;
  slot_ends_at: string;
};

export type AdminBookingReservationsPage = {
  items: AdminBookingReservationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
