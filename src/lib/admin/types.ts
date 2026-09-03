import type { ProfileGender } from "@/lib/profile/gender";
import type { LocationAmenityIconKey } from "@/lib/locations/icons";

export type TenantMembershipRole = "owner" | "coach" | "member";
export type ProgramDifficulty = "beginner" | "intermediate" | "advanced";
export type ProgramMobileVisibility = "public" | "members_only" | "private";
export type ProgramDeliveryMode = "fixed_date" | "cohort_based";
export type AdminProgramDifficultyFilter = "all" | ProgramDifficulty;
export type AdminProgramMobileVisibilityFilter = "all" | ProgramMobileVisibility;
export type AdminProgramDeliveryModeFilter = "all" | ProgramDeliveryMode;
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

export type TenantUserHyroxProfile = {
  is_xon_member?: boolean | null;
  hyrox_division?: string | null;
  has_hyrox_race_experience?: boolean | null;
  hyrox_goal?: string | null;
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
  hyrox_profile: TenantUserHyroxProfile;
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
  brand_name: string;
  team_name: string;
  logo_url: string;
  banner_image_url: string;
  program_card_image_url: string;
  instagram: string;
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

export type AdminSubscriptionStatus = "incomplete" | "active" | "past_due" | "canceled";
export type AdminSubscriptionStatusFilter = AdminSubscriptionStatus | "all";

export type AdminSubscriptionRow = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone_number: string | null;
  provider: string;
  provider_product_id: string | null;
  provider_price_id: string | null;
  provider_checkout_id: string | null;
  generated_program_id: string | null;
  program_title: string | null;
  amount: number | null;
  currency: string | null;
  recurring_interval: string | null;
  recurring_interval_count: number | null;
  status: AdminSubscriptionStatus;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  current_period_start_at: string | null;
  current_period_end_at: string | null;
  next_billing_at: string | null;
  last_paid_at: string | null;
  last_failed_at: string | null;
  latest_cycle_status: string | null;
  latest_cycle_paid_at: string | null;
  latest_cycle_failed_at: string | null;
  created_at: string;
};

export type AdminSubscriptionsPage = {
  items: AdminSubscriptionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  status: AdminSubscriptionStatusFilter;
};

export type GuestOrderStatus = "pending" | "confirmed" | "canceled";

export type AdminGuestOrderFilter = "all" | GuestOrderStatus;

export type GuestOrderCouponDiscountType = "amount" | "percent";

export type AdminGuestOrderCouponRow = {
  id: string;
  code: string;
  discount_type: GuestOrderCouponDiscountType;
  discount_value: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminGuestOrderCouponsPage = {
  items: AdminGuestOrderCouponRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PartnerDiscountVisibilityScope = "all_members" | "program_members";

export type PartnerDiscountMobileVisibility = "public" | "private";

export type AdminPartnerDiscountCodeRow = {
  id: string;
  brand_name: string;
  brand_logo_url: string;
  title: string;
  description: string;
  terms_text: string;
  use_url: string;
  code_text: string;
  visibility_scope: PartnerDiscountVisibilityScope;
  program_id: string | null;
  program_title: string | null;
  mobile_visibility: PartnerDiscountMobileVisibility;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPartnerDiscountProgramOption = {
  id: string;
  title: string;
};

export type AdminPartnerDiscountCodesPage = {
  items: AdminPartnerDiscountCodeRow[];
  programs: AdminPartnerDiscountProgramOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminPartnerDiscountCodeEditorData = {
  code: AdminPartnerDiscountCodeRow | null;
  programs: AdminPartnerDiscountProgramOption[];
};

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

export type AdminProgramMemberChartMonth = {
  month: string;
  label: string;
};

export type AdminProgramMemberChartProgram = {
  program_id: string;
  program_title: string;
  color: string;
};

export type AdminProgramMemberChartDataRow = {
  month: string;
  label: string;
  [programId: string]: string | number;
};

export type AdminProgramMemberChartStats = {
  months: AdminProgramMemberChartMonth[];
  programs: AdminProgramMemberChartProgram[];
  data: AdminProgramMemberChartDataRow[];
  total_program_count: number;
};

export type AdminProgramFeedbackAchievementRow = {
  program_id: string;
  program_title: string;
  reviewed_count: number;
  review_total_count: number;
  completion_rate: number;
};

export type AdminProgramFeedbackAchievementStats = {
  range_start: string;
  range_end: string;
  programs: AdminProgramFeedbackAchievementRow[];
};

export type AdminProgramApplicationRow = {
  id: string;
  program_id: string;
  program_title: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone_number: string | null;
  user_avatar_url: string | null;
  status: ProgramApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type AdminProgramApplicationFilter = ProgramApplicationStatus | "all";
export type AdminMembershipGrantView = "applications" | "users";
export type AdminMembershipGrantPeriodType = "program_period" | "1" | "2" | "3" | "6";

export type AdminMembershipGrantProgramOption = {
  id: string;
  label: string;
  deliveryMode: ProgramDeliveryMode;
  cohorts: Array<{ id: string; name: string; starts_on: string; is_default: boolean }>;
};

export type AdminMembershipGrantUserApplication = {
  id: string;
  program_id: string;
  program_title: string;
  status: ProgramApplicationStatus;
  created_at: string;
};

export type AdminMembershipGrantUserEntitlement = {
  id: string;
  program_id: string;
  program_title: string;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
};

export type AdminMembershipGrantUserRow = {
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone_number: string | null;
  user_avatar_url: string | null;
  created_at: string;
  tenant_role: TenantMembershipRole | null;
  current_program_id: string | null;
  applications: AdminMembershipGrantUserApplication[];
  entitlements: AdminMembershipGrantUserEntitlement[];
};

export type AdminProgramApplicationsPage = {
  items: AdminProgramApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminProgramApplicationFilter;
};

export type AdminMembershipGrantUsersPage = {
  items: AdminMembershipGrantUserRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

export type YoutubeContentRow = {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_video_id: string;
  thumbnail_url: string | null;
  preview_video_url: string | null;
  preview_video_mime_type: string | null;
  genre: string;
  tags: string[];
  display_order: number;
  is_published: boolean;
  mobile_visibility: "public" | "private";
  published_at: string | null;
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

export type AdminYoutubeContentsPage = {
  items: YoutubeContentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type OfflineClassStatus = "pre_open" | "open" | "closed";
export type OfflineClassRegistrationStatus = "pending" | "confirmed" | "rejected" | "canceled";

export type OfflineClassRow = {
  id: string;
  title: string;
  subtitle: string;
  content_html: string;
  location_text: string;
  address_text: string;
  starts_at: string;
  ends_at: string;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  cancellation_closes_at: string | null;
  capacity: number;
  status: OfflineClassStatus;
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
  status: OfflineClassRegistrationStatus;
  confirmed_at: string | null;
  confirmed_by: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
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
export type CoachReaction = "good" | "great" | "excellent" | "consistent" | "needs_recovery";

export type AdminRecentProgramSessionReviewRow = {
  id: string;
  program_title: string;
  session_title: string;
  session_date: string;
  user_name: string;
  user_avatar_url: string | null;
  completion_note: string;
  status: ProgramSessionReviewStatus;
  has_coach_feedback: boolean;
  created_at: string;
};

export type AdminProgramSessionReviewRow = {
  id: string;
  program_id: string;
  program_title: string;
  session_id: string;
  session_date: string;
  session_title: string;
  session_content_html: string;
  session_type: SessionType;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  hyrox_profile: TenantUserHyroxProfile;
  completion_note: string;
  intensity_rpe: number | null;
  heart_rate_bpm: number | null;
  status: ProgramSessionReviewStatus;
  coach_feedback: string;
  coach_reaction: CoachReaction | null;
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

export type AdminPendingProgramSessionReviewRow = {
  id: string;
  session_date: string;
  program_title: string;
  user_name: string;
  user_avatar_url: string | null;
  completion_note: string;
  created_at: string;
};

export type AdminProgramSessionReviewsCalendarData = {
  items: AdminProgramSessionReviewRow[];
  pendingItems: AdminPendingProgramSessionReviewRow[];
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

export type AdminLocationAmenity = {
  label: string;
  description: string;
  iconKey: LocationAmenityIconKey;
};

export type AdminLocationRow = {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  description: string;
  thumbnail_url: string;
  image_urls: string[];
  map_image_url: string;
  amenities: AdminLocationAmenity[];
  sort_order: number;
  is_new: boolean;
  is_published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type AdminLocationListRow = {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  thumbnail_url: string;
  image_count: number;
  is_new: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AdminLocationsPage = {
  items: AdminLocationListRow[];
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
