import { redirect } from "next/navigation";

import { getTenantLoginPath } from "@/lib/auth/paths";
import { programToEditorData } from "@/lib/about/content";
import { getSignedInHomePath } from "@/lib/auth/redirects";
import { getProgramCoachProfiles } from "@/lib/coach-profiles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  canManageTenantContent,
  listTenantUserProfiles,
  resolveTenantAvatarUrl,
  resolveTenantDisplayName,
  getTenantBySlug,
  getUserTenantRole,
  isPlatformAdmin,
} from "@/lib/tenant/server";
import type {
  AdminCoachProfileCandidate,
  AdminCoachProfileRow,
  AdminBookingReservationsPage,
  AdminLocationsPage,
  AdminLocationListRow,
  AdminLocationRow,
  AdminBookingServicesPage,
  AdminBookingServiceListRow,
  AdminBookingServiceRow,
  AdminDeactivatedAccountRow,
  AdminGuestOrderFilter,
  AdminGuestOrderCouponsPage,
  AdminGuestOrderRevenuePage,
  AdminGuestOrderRevenueRange,
  AdminGuestOrdersPage,
  AdminPartnerDiscountCodeEditorData,
  AdminPartnerDiscountCodeRow,
  AdminPartnerDiscountCodesPage,
  AdminPartnerDiscountProgramOption,
  AdminLegalDocumentsPage,
  AdminNoticesPage,
  AdminProgramListRow,
  AdminProgramCohortRow,
  AdminProgramApplicationFilter,
  AdminProgramApplicationsPage,
  AdminMembershipGrantUsersPage,
  AdminProgramOrderFilter,
  AdminProgramOrdersPage,
  AdminProgramProductRow,
  AdminProgramProductsPage,
  AdminProgramsPage,
  AdminCommunityPostRow,
  AdminProgramCoachOption,
  AdminProgramEditorRow,
  AdminCommunityPostsPage,
  AdminCommunityReportRow,
  AdminCommunityReportsPage,
  AdminMembershipRow,
  AdminMembershipsPage,
  AdminMembershipStatus,
  AdminMembershipStatusFilter,
  AdminProgramSessionReviewRow,
  AdminProgramSessionReviewsCalendarData,
  AdminProgramSessionReviewsPage,
  AdminWorkoutExerciseOption,
  AdminWorkoutLeaderboardItem,
  AdminWorkoutLeaderboardPage,
  AdminWorkoutPresetOption,
  AdminUserWorkoutRecordRow,
  CommunityPostStatus,
  CommunityReportStatus,
  ManagedUsersPage,
  ManagedUserProgramEntitlement,
  ManagedUserSortBy,
  ManagedUserRow,
  NoticeRow,
  OfflineClassRegistrationRow,
  OfflineClassRow,
  OfflineClassWithParticipants,
  ProgramRow,
  ProgramApplicationStatus,
  ProgramSessionReviewStatus,
  SessionRow,
  SessionType,
  LegalDocumentType,
  LegalDocumentLocale,
  TenantBrandingEditorData,
  TenantMembershipRole,
  TenantUserHyroxProfile,
  GuestOrderStatus,
} from "@/lib/admin/types";
import { normalizeLocationAmenities, normalizeStringArray } from "@/lib/locations/server";
import { isProfileGender, type ProfileGender } from "@/lib/profile/gender";

type ProgramPickerRow = {
  id: string;
  title: string;
  slogan: string;
  thumbnail_url: string | null;
  start_date: string;
  end_date: string;
  delivery_mode: "fixed_date" | "cohort_based";
  content_starts_on: string | null;
  content_ends_on: string | null;
};

type CoachProfileRecordRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  display_name: string;
  instagram: string;
  introduction: string;
  career: unknown;
  image_url: string;
  additional_image_urls: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CoachMembershipRow = {
  user_id: string;
  role: TenantMembershipRole;
};

type CoachProfileUserRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function normalizeStandardPagedParams(page: number, pageSize: number) {
  const normalizedPageSize = [10, 20, 50].includes(pageSize) ? pageSize : 20;
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  return {
    normalizedPage,
    normalizedPageSize,
  };
}

function getCurrentAdminMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

function getCurrentAdminDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : new Date().toISOString().slice(0, 10);
}

function normalizeAdminMonthKey(month: string | undefined) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return getCurrentAdminMonthKey();
  }

  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthNumber = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) || year < 1900 || monthNumber < 1 || monthNumber > 12) {
    return getCurrentAdminMonthKey();
  }

  return `${yearRaw}-${monthRaw}`;
}

function getSeoulMonthUtcRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1, -9, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNumber, 1, -9, 0, 0, 0));

  return { start: start.toISOString(), end: end.toISOString() };
}

function getSeoulDateUtcRange(date: string) {
  const [year, monthNumber, day] = date.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, day, -9, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNumber - 1, day + 1, -9, 0, 0, 0));

  return { start: start.toISOString(), end: end.toISOString() };
}

export async function requireAdminUser(tenantSlug: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (tenantSlug) {
      redirect(`${getTenantLoginPath(tenantSlug)}?next=${encodeURIComponent(`/t/${tenantSlug}/admin`)}`);
    }

    redirect(getTenantLoginPath("xon-training"));
  }

  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    redirect(await getSignedInHomePath(supabase));
  }

  const [platformAdmin, tenantRole] = await Promise.all([
    isPlatformAdmin(supabase, user.id),
    getUserTenantRole(supabase, user.id, tenant.id),
  ]);

  const isAdmin = platformAdmin || canManageTenantContent(tenantRole);

  return {
    supabase,
    user,
    isAdmin,
    isPlatformAdmin: platformAdmin,
    tenant,
    tenantRole,
  };
}

export async function getPrimarySessionProgramId(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("programs")
    .select("id")
    .eq("tenant_id", tenant.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

async function getManagedProgramIdsForUser(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  userId: string
) {
  const { data: coachProfiles } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .returns<Array<{ id: string }>>();

  const coachProfileIds = (coachProfiles ?? []).map((profile) => profile.id);
  if (coachProfileIds.length === 0) {
    return [] as string[];
  }

  const { data: assignments } = await supabase
    .from("program_coaches")
    .select("program_id")
    .in("coach_profile_id", coachProfileIds)
    .returns<Array<{ program_id: string }>>();

  return [...new Set((assignments ?? []).map((assignment) => assignment.program_id))];
}

export async function getTenantSessionPrograms(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [] as Array<{
      id: string;
      label: string;
      thumbnailUrl: string | null;
      deliveryMode: "fixed_date" | "cohort_based";
      contentStartsOn: string | null;
      contentEndsOn: string | null;
      cohorts: Array<{ id: string; name: string; starts_on: string; is_default: boolean }>;
    }>;
  }

  const [{ data }, { data: cohorts }] = await Promise.all([
    supabase
      .from("programs")
      .select("id, title, slogan, thumbnail_url, start_date, end_date, delivery_mode, content_starts_on, content_ends_on")
      .eq("tenant_id", tenant.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<ProgramPickerRow[]>(),
    supabase
      .from("program_cohorts")
      .select("id, program_id, name, starts_on, is_default")
      .eq("tenant_id", tenant.id)
      .order("starts_on", { ascending: true })
      .returns<Array<{ id: string; program_id: string; name: string; starts_on: string; is_default: boolean }>>(),
  ]);

  const cohortsByProgramId = new Map<string, Array<{ id: string; name: string; starts_on: string; is_default: boolean }>>();
  for (const cohort of cohorts ?? []) {
    const current = cohortsByProgramId.get(cohort.program_id) ?? [];
    current.push({
      id: cohort.id,
      name: cohort.name,
      starts_on: cohort.starts_on,
      is_default: cohort.is_default,
    });
    cohortsByProgramId.set(cohort.program_id, current);
  }

  return (data ?? []).map((program, index) => {
    const title = program.title?.trim() || program.slogan?.trim() || `프로그램 ${index + 1}`;
    return {
      id: program.id,
      label: title,
      thumbnailUrl: program.thumbnail_url,
      deliveryMode: program.delivery_mode,
      contentStartsOn: program.content_starts_on,
      contentEndsOn: program.content_ends_on,
      cohorts: cohortsByProgramId.get(program.id) ?? [],
    };
  });
}

export async function getAdminHomeOverview(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } }
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const now = new Date();
  const todayKey = getCurrentAdminDateKey();
  const todayRange = getSeoulDateUtcRange(todayKey);

  if (!tenant) {
    return {
      displayName: user.user_metadata?.full_name?.trim() || user.email || "코치",
      todayKey,
      programCount: 0,
      activeProgramMemberCount: 0,
      todaySignupMemberCount: 0,
      sessionReviewCount: 0,
      pendingSessionReviewCount: 0,
      workoutRecordUserCount: 0,
      monthlyGuestOrderCount: 0,
      guestOrderRevenueKrw: 0,
      confirmedGuestOrderCount: 0,
      coachProfileCount: 0,
      isScopedToManagedPrograms: true,
    };
  }

  const [{ count: coachProfileCount = 0 }, { data: coachProfile }] = await Promise.all([
    supabase
      .from("coach_profiles")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id),
    supabase
      .from("coach_profiles")
      .select("display_name")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .maybeSingle<{ display_name: string | null }>(),
  ]);
  const coachDisplayName = coachProfile?.display_name?.trim();

  const [platformAdmin, tenantRole, managedProgramIds] = await Promise.all([
    isPlatformAdmin(supabase, user.id),
    getUserTenantRole(supabase, user.id, tenant.id),
    getManagedProgramIdsForUser(supabase, tenant.id, user.id),
  ]);
  const isScopedToManagedPrograms = !platformAdmin && tenantRole !== "owner";
  const scopedProgramIds = isScopedToManagedPrograms ? managedProgramIds : [];
  const currentMonthRange = getSeoulMonthUtcRange(getCurrentAdminMonthKey());
  const recentRevenueMonthKeys = getRecentKstMonthKeys(12);
  const revenueStartIso = recentRevenueMonthKeys[0] ? kstMonthStartToUtcIso(recentRevenueMonthKeys[0]) : null;

  const [workoutRecordUsersRes, monthlyGuestOrderCountRes, { data: confirmedGuestOrderRows }, { data: tenantMembershipRows }, authUsersAll] = await Promise.all([
    supabase.from("user_workout_records_v2").select("user_id").eq("tenant_id", tenant.id).returns<Array<{ user_id: string }>>(),
    createSupabaseAdminClient()
      .from("guest_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .gte("created_at", currentMonthRange.start)
      .lt("created_at", currentMonthRange.end),
    (() => {
      let query = createSupabaseAdminClient()
        .from("guest_orders")
        .select("order_payload")
        .eq("tenant_id", tenant.id)
        .eq("status", "confirmed")
        .not("confirmed_at", "is", null);

      if (revenueStartIso) {
        query = query.gte("confirmed_at", revenueStartIso);
      }

      return query.returns<Array<{ order_payload: Record<string, unknown> | null }>>();
    })(),
    supabase.from("tenant_memberships").select("user_id").eq("tenant_id", tenant.id).returns<Array<{ user_id: string }>>(),
    listAllAuthUsers(),
  ]);
  const workoutRecordUserCount = new Set((workoutRecordUsersRes.data ?? []).map((row) => row.user_id)).size;
  const monthlyGuestOrderCount = monthlyGuestOrderCountRes.count ?? 0;
  const confirmedGuestOrderCount = confirmedGuestOrderRows?.length ?? 0;
  const guestOrderRevenueKrw = (confirmedGuestOrderRows ?? []).reduce(
    (sum, row) => sum + getGuestOrderAmountKrw(row.order_payload),
    0
  );
  const tenantMemberIds = new Set((tenantMembershipRows ?? []).map((row) => row.user_id));
  const todayStartTime = Date.parse(todayRange.start);
  const todayEndTime = Date.parse(todayRange.end);
  const todaySignupMemberCount = authUsersAll.filter((authUser) => {
    if (!tenantMemberIds.has(authUser.id)) {
      return false;
    }

    const createdAtTime = Date.parse(authUser.created_at);
    return Number.isFinite(createdAtTime) && createdAtTime >= todayStartTime && createdAtTime < todayEndTime;
  }).length;

  if (isScopedToManagedPrograms && scopedProgramIds.length === 0) {
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle<{ full_name: string | null }>();

    return {
      displayName: coachDisplayName || profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || user.email || "코치",
      todayKey,
      programCount: 0,
      activeProgramMemberCount: 0,
      todaySignupMemberCount,
      sessionReviewCount: 0,
      pendingSessionReviewCount: 0,
      workoutRecordUserCount,
      monthlyGuestOrderCount,
      guestOrderRevenueKrw,
      confirmedGuestOrderCount,
      coachProfileCount,
      isScopedToManagedPrograms,
    };
  }

  const [{ data: profile }, programCountRes, sessionReviewCountRes, pendingSessionReviewCountRes, { data: entitlementRows }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle<{ full_name: string | null }>(),
    (() => {
      let query = supabase.from("programs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
      if (isScopedToManagedPrograms) {
        query = query.in("id", scopedProgramIds);
      }
      return query;
    })(),
    (() => {
      let query = supabase.from("program_session_reviews").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
      if (isScopedToManagedPrograms) {
        query = query.in("program_id", scopedProgramIds);
      }
      return query;
    })(),
    (() => {
      let query = supabase
        .from("program_session_reviews")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("status", "submitted");
      if (isScopedToManagedPrograms) {
        query = query.in("program_id", scopedProgramIds);
      }
      return query;
    })(),
    (() => {
      let query = supabase
        .from("program_entitlements")
        .select("user_id")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gte.${now.toISOString()}`);
      if (isScopedToManagedPrograms) {
        query = query.in("program_id", scopedProgramIds);
      }
      return query.returns<Array<{ user_id: string }>>();
    })(),
  ]);

  const displayName = coachDisplayName || profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || user.email || "코치";
  const activeProgramMemberCount = new Set((entitlementRows ?? []).map((row) => row.user_id)).size;

  return {
    displayName,
    todayKey,
    programCount: programCountRes.count ?? 0,
    activeProgramMemberCount,
    todaySignupMemberCount,
    sessionReviewCount: sessionReviewCountRes.count ?? 0,
    pendingSessionReviewCount: pendingSessionReviewCountRes.count ?? 0,
    workoutRecordUserCount,
    monthlyGuestOrderCount,
    guestOrderRevenueKrw,
    confirmedGuestOrderCount,
    coachProfileCount,
    isScopedToManagedPrograms,
  };
}

export async function getAdminCoachProfiles(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      profiles: [] as AdminCoachProfileRow[],
      candidates: [] as AdminCoachProfileCandidate[],
    };
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant.id)
    .in("role", ["owner", "coach"])
    .returns<CoachMembershipRow[]>();

  const coachMemberships = memberships ?? [];
  const memberIds = [...new Set(coachMemberships.map((membership) => membership.user_id))];
  if (memberIds.length === 0) {
    return {
      profiles: [] as AdminCoachProfileRow[],
      candidates: [] as AdminCoachProfileCandidate[],
    };
  }

  const [{ data: coachProfiles }, { data: profileRows }, authUsersAll] = await Promise.all([
    supabase
      .from("coach_profiles")
      .select("id, tenant_id, user_id, display_name, instagram, introduction, career, image_url, additional_image_urls, is_active, created_at, updated_at")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: true })
      .returns<CoachProfileRecordRow[]>(),
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", memberIds).returns<CoachProfileUserRow[]>(),
    listAllAuthUsers(),
  ]);

  const roleById = new Map(coachMemberships.map((membership) => [membership.user_id, membership.role]));
  const profileById = new Map((profileRows ?? []).map((profile) => [profile.id, profile]));
  const authUserById = new Map(
    authUsersAll.filter((authUser) => memberIds.includes(authUser.id)).map((authUser) => [authUser.id, authUser])
  );

  const profiles = (coachProfiles ?? []).map((item) => {
    const profile = profileById.get(item.user_id);
    const authUser = authUserById.get(item.user_id);
    const memberFullName = profile?.full_name?.trim() || authUser?.user_metadata?.full_name?.trim() || authUser?.email || "코치";

    return {
      id: item.id,
      tenant_id: item.tenant_id,
      user_id: item.user_id,
      display_name: item.display_name?.trim() || memberFullName,
      instagram: item.instagram ?? "",
      introduction: item.introduction ?? "",
      career: toStringArray(item.career),
      image_url: item.image_url ?? "",
      additional_image_urls: toStringArray(item.additional_image_urls),
      is_active: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
      member_role: roleById.get(item.user_id) ?? "coach",
      member_full_name: memberFullName,
      member_email: authUser?.email ?? "",
      member_avatar_url: profile?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? null,
    } satisfies AdminCoachProfileRow;
  });

  const profiledUserIds = new Set(profiles.map((profile) => profile.user_id));
  const candidates = memberIds
    .filter((userId) => !profiledUserIds.has(userId))
    .map((userId) => {
      const profile = profileById.get(userId);
      const authUser = authUserById.get(userId);
      const fullName = profile?.full_name?.trim() || authUser?.user_metadata?.full_name?.trim() || authUser?.email || "코치";

      return {
        user_id: userId,
        full_name: fullName,
        email: authUser?.email ?? "",
        avatar_url: profile?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? null,
        role: roleById.get(userId) ?? "coach",
      } satisfies AdminCoachProfileCandidate;
    })
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ko"));

  return {
    profiles: profiles.sort((a, b) => a.display_name.localeCompare(b.display_name, "ko")),
    candidates,
  };
}

export async function getAdminCoachProfileById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  id: string
) {
  const { profiles } = await getAdminCoachProfiles(supabase, tenantSlug);
  return profiles.find((profile) => profile.id === id) ?? null;
}

export async function getProgramInfoEditorData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id, team_name, thumbnail_url, slogan, description, coach_name, coach_instagram, coach_career, start_date, end_date")
    .eq("tenant_id", tenant.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramRow>();

  if (!program) {
    return null;
  }

  return programToEditorData(program);
}

export async function getTenantBrandingEditorData(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("tenant_branding")
    .select(
      "tenant_id, team_name, logo_url, coach_image_url, bank_name, bank_account_number, bank_account_holder, bank_deposit_guide, slogan, description, coach_name, coach_instagram, coach_career"
    )
    .eq("tenant_id", tenant.id)
    .maybeSingle<TenantBrandingEditorData>();

  return data ?? null;
}

export async function getAdminPrograms(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const result = await getAdminProgramsPage(supabase, tenantSlug, { page: 1, pageSize: 50 });
  return result.items;
}

export async function getAdminProgramsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  { page, pageSize }: { page: number; pageSize: number }
): Promise<AdminProgramsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const { count } = await supabase
    .from("programs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data } = await supabase
    .from("programs")
    .select(
      "id, display_order, title, description, thumbnail_url, mobile_visibility, difficulty, daily_workout_minutes, days_per_week, delivery_mode, content_starts_on, content_ends_on, start_date, end_date, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to)
    .returns<AdminProgramListRow[]>();

  return {
    items: data ?? [],
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminProgramById(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string, id: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const [{ data }, { data: availableCoaches }, { data: cohorts }] = await Promise.all([
    supabase
    .from("programs")
    .select(
      "id, display_order, title, description, thumbnail_url, mobile_visibility, difficulty, daily_workout_minutes, days_per_week, delivery_mode, content_starts_on, content_ends_on, start_date, end_date, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<AdminProgramListRow>(),
    supabase
      .from("coach_profiles")
      .select("id, user_id, display_name, instagram, image_url, is_active")
      .eq("tenant_id", tenant.id)
      .order("display_name", { ascending: true })
      .returns<AdminProgramCoachOption[]>(),
    supabase
      .from("program_cohorts")
      .select("id, tenant_id, program_id, name, starts_on, is_default, created_at, updated_at")
      .eq("tenant_id", tenant.id)
      .eq("program_id", id)
      .order("starts_on", { ascending: true })
      .returns<AdminProgramCohortRow[]>(),
  ]);

  if (!data) {
    return null;
  }

  const assignedCoaches = await getProgramCoachProfiles(supabase, id);

  return {
    ...data,
    available_coaches: (availableCoaches ?? []).filter((coach) => coach.is_active),
    selected_coach_profile_ids: assignedCoaches.map((coach) => coach.id),
    primary_coach_profile_id: assignedCoaches.find((coach) => coach.is_primary)?.id ?? assignedCoaches[0]?.id ?? null,
    cohorts: cohorts ?? [],
  } satisfies AdminProgramEditorRow;
}

export async function getAdminProgramProducts(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const result = await getAdminProgramProductsPage(supabase, tenantSlug, { page: 1, pageSize: 50 });
  return result.items;
}

export async function getAdminProgramProductsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  { page, pageSize }: { page: number; pageSize: number }
): Promise<AdminProgramProductsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const { count } = await supabase
    .from("program_products")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data } = await supabase
    .from("program_products")
    .select(
      "id, tenant_id, program_id, price_krw, sale_status, is_active, sale_type, billing_interval, billing_anchor_day, subscription_grace_days, thumbnail_urls, intro_image_url, content_html, program:program_id(title)"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<
      Array<{
        id: string;
        tenant_id: string;
        program_id: string;
        price_krw: number;
        sale_status: "active" | "preparing" | "private" | null;
        is_active: boolean;
        sale_type: "one_time" | "subscription" | null;
        billing_interval: "monthly" | null;
        billing_anchor_day: number | null;
        subscription_grace_days: number | null;
        thumbnail_urls: unknown;
        intro_image_url: string | null;
        content_html: string | null;
        program: { title: string } | null;
      }>
    >();

  const productIds = (data ?? []).map((row) => row.id);
  const { data: durationOptions } = productIds.length
    ? await supabase
        .from("program_product_duration_options")
        .select("product_id, duration_months, price_krw, is_enabled")
        .in("product_id", productIds)
        .returns<
          Array<{
            product_id: string;
            duration_months: 1 | 2 | 3 | 6;
            price_krw: number;
            is_enabled: boolean;
          }>
        >()
    : { data: [] as Array<{ product_id: string; duration_months: 1 | 2 | 3 | 6; price_krw: number; is_enabled: boolean }> };

  const durationOptionsByProductId = new Map<string, AdminProgramProductRow["duration_options"]>();
  for (const option of durationOptions ?? []) {
    const current = durationOptionsByProductId.get(option.product_id) ?? [];
    current.push({
      duration_months: option.duration_months,
      price_krw: option.price_krw,
      is_enabled: option.is_enabled,
    });
    current.sort((a, b) => a.duration_months - b.duration_months);
    durationOptionsByProductId.set(option.product_id, current);
  }

  const items = (data ?? []).map((row) => {
    const saleType: AdminProgramProductRow["sale_type"] = row.sale_type === "subscription" ? "subscription" : "one_time";
    const mappedDurationOptions = durationOptionsByProductId.get(row.id) ?? [];
    const displayPrice =
      saleType === "one_time"
        ? mappedDurationOptions.filter((option) => option.is_enabled).map((option) => option.price_krw).sort((a, b) => a - b)[0] ?? row.price_krw
        : row.price_krw;

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      program_id: row.program_id,
      price_krw: displayPrice,
      sale_status:
        row.sale_status === "active" || row.sale_status === "preparing" || row.sale_status === "private"
          ? row.sale_status
          : row.is_active
          ? "active"
          : "private",
      is_active: row.is_active,
      sale_type: saleType,
      billing_interval: saleType === "subscription" ? (row.billing_interval ?? "monthly") : null,
      billing_anchor_day: row.billing_anchor_day,
      subscription_grace_days: row.subscription_grace_days ?? 3,
      duration_options: mappedDurationOptions,
      program_title: row.program?.title ?? "제목 없음",
      thumbnail_urls: Array.isArray(row.thumbnail_urls)
        ? row.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
        : [],
      intro_image_url: row.intro_image_url ?? "",
      content_html: row.content_html ?? "",
    } satisfies AdminProgramProductRow;
  });

  return {
    items,
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminProgramProductById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  id: string
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const [{ data }, { data: durationOptions }] = await Promise.all([
    supabase
      .from("program_products")
      .select(
        "id, tenant_id, program_id, price_krw, sale_status, is_active, sale_type, billing_interval, billing_anchor_day, subscription_grace_days, thumbnail_urls, intro_image_url, content_html, program:program_id(title)"
      )
      .eq("tenant_id", tenant.id)
      .eq("id", id)
      .maybeSingle<{
        id: string;
        tenant_id: string;
        program_id: string;
        price_krw: number;
        sale_status: "active" | "preparing" | "private" | null;
        is_active: boolean;
        sale_type: "one_time" | "subscription" | null;
        billing_interval: "monthly" | null;
        billing_anchor_day: number | null;
        subscription_grace_days: number | null;
        thumbnail_urls: unknown;
        intro_image_url: string | null;
        content_html: string | null;
        program: { title: string } | null;
      }>(),
    supabase
      .from("program_product_duration_options")
      .select("product_id, duration_months, price_krw, is_enabled")
      .eq("product_id", id)
      .returns<
        Array<{
          product_id: string;
          duration_months: 1 | 2 | 3 | 6;
          price_krw: number;
          is_enabled: boolean;
        }>
      >(),
  ]);

  if (!data) {
    return null;
  }

  const saleType: AdminProgramProductRow["sale_type"] = data.sale_type === "subscription" ? "subscription" : "one_time";
  const mappedDurationOptions = (durationOptions ?? [])
    .map((option) => ({
      duration_months: option.duration_months,
      price_krw: option.price_krw,
      is_enabled: option.is_enabled,
    }))
    .sort((a, b) => a.duration_months - b.duration_months);
  const displayPrice =
    saleType === "one_time"
      ? mappedDurationOptions.filter((option) => option.is_enabled).map((option) => option.price_krw).sort((a, b) => a - b)[0] ?? data.price_krw
      : data.price_krw;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    program_id: data.program_id,
    price_krw: displayPrice,
    sale_status:
      data.sale_status === "active" || data.sale_status === "preparing" || data.sale_status === "private"
        ? data.sale_status
        : data.is_active
        ? "active"
        : "private",
    is_active: data.is_active,
    sale_type: saleType,
    billing_interval: saleType === "subscription" ? (data.billing_interval ?? "monthly") : null,
    billing_anchor_day: data.billing_anchor_day,
    subscription_grace_days: data.subscription_grace_days ?? 3,
    duration_options: mappedDurationOptions,
    program_title: data.program?.title ?? "제목 없음",
    thumbnail_urls: Array.isArray(data.thumbnail_urls)
      ? data.thumbnail_urls.filter((url): url is string => typeof url === "string" && url.length > 0)
      : [],
    intro_image_url: data.intro_image_url ?? "",
    content_html: data.content_html ?? "",
  } satisfies AdminProgramProductRow;
}

export async function getAdminProgramOrders(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const result = await getAdminProgramOrdersPage(supabase, tenantSlug, {
    filter: "all",
    page: 1,
    pageSize: 50,
  });
  return result.items;
}

function matchesProgramOrderFilter(
  order: { payment_method: string | null; status: string },
  filter: AdminProgramOrderFilter
) {
  if (filter === "bank_pending") {
    return order.payment_method === "bank_transfer" && order.status === "pending";
  }

  if (filter === "bank_paid") {
    return order.payment_method === "bank_transfer" && order.status === "paid";
  }

  if (filter === "toss") {
    return order.payment_method === "toss_card" || order.payment_method === "toss_subscription";
  }

  return true;
}

function isGuestOrderStatus(value: string): value is GuestOrderStatus {
  return value === "pending" || value === "confirmed" || value === "canceled";
}

function isGuestOrderCouponDiscountType(value: string): value is "amount" | "percent" {
  return value === "amount" || value === "percent";
}

function isPartnerDiscountVisibilityScope(value: string): value is "all_members" | "program_members" {
  return value === "all_members" || value === "program_members";
}

function isPartnerDiscountMobileVisibility(value: string): value is "public" | "private" {
  return value === "public" || value === "private";
}

type PartnerDiscountCodeQueryRow = {
  id: string;
  brand_name: string;
  brand_logo_url: string;
  title: string;
  description: string;
  terms_text: string;
  use_url: string;
  code_text: string;
  visibility_scope: string;
  program_id: string | null;
  mobile_visibility: string;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  program: { title: string | null } | null;
};

type PartnerDiscountProgramQueryRow = {
  id: string;
  title: string | null;
  slogan: string | null;
};

function mapPartnerDiscountCodeRow(row: PartnerDiscountCodeQueryRow): AdminPartnerDiscountCodeRow {
  return {
    id: row.id,
    brand_name: row.brand_name,
    brand_logo_url: row.brand_logo_url,
    title: row.title,
    description: row.description,
    terms_text: row.terms_text,
    use_url: row.use_url,
    code_text: row.code_text,
    visibility_scope: isPartnerDiscountVisibilityScope(row.visibility_scope) ? row.visibility_scope : "all_members",
    program_id: row.program_id,
    program_title: row.program?.title?.trim() || null,
    mobile_visibility: isPartnerDiscountMobileVisibility(row.mobile_visibility) ? row.mobile_visibility : "private",
    is_active: row.is_active,
    display_order: row.display_order,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapPartnerDiscountProgramOptions(programs: PartnerDiscountProgramQueryRow[] | null | undefined): AdminPartnerDiscountProgramOption[] {
  return (programs ?? []).map((program, index) => ({
    id: program.id,
    title: program.title?.trim() || program.slogan?.trim() || `프로그램 ${index + 1}`,
  }));
}

export async function getAdminProgramOrdersPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    filter,
    page,
    pageSize,
  }: {
    filter: AdminProgramOrderFilter;
    page: number;
    pageSize: number;
  }
): Promise<AdminProgramOrdersPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
      filter,
    };
  }

  const { data: orders } = await supabase
    .from("program_orders")
    .select(
      "id, provider_order_id, buyer_user_id, buyer_name, buyer_email, buyer_phone, depositor_name, payment_method, amount_krw, status, paid_at, created_at, duration_months, product:product_id(program:program_id(title))"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        provider_order_id: string;
        buyer_user_id: string;
        buyer_name: string | null;
        buyer_email: string | null;
        buyer_phone: string | null;
        depositor_name: string | null;
        payment_method: string | null;
        amount_krw: number;
        status: string;
        paid_at: string | null;
        created_at: string;
        duration_months: 1 | 2 | 3 | 6 | null;
        product: { program: { title: string } | null } | null;
      }>
    >();

  const buyerIds = [...new Set((orders ?? []).map((row) => row.buyer_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", buyerIds)
    .returns<Array<{ id: string; full_name: string | null }>>();

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name?.trim() || "회원"]));

  const filtered = (orders ?? [])
    .filter((row) => matchesProgramOrderFilter(row, filter))
    .map((row) => ({
    id: row.id,
    provider_order_id: row.provider_order_id,
    buyer_user_id: row.buyer_user_id,
    buyer_name: row.buyer_name?.trim() || profileMap.get(row.buyer_user_id) || "회원",
    buyer_email: row.buyer_email?.trim() ?? "",
    buyer_phone: row.buyer_phone?.trim() ?? "",
    depositor_name: row.depositor_name?.trim() ?? "",
    payment_method: row.payment_method,
    product_title:
      row.duration_months === null
        ? row.product?.program?.title ?? "프로그램"
        : `${row.product?.program?.title ?? "프로그램"} · ${row.duration_months}개월 이용권`,
    duration_months: row.duration_months,
    amount_krw: row.amount_krw,
    status: row.status,
    paid_at: row.paid_at,
    created_at: row.created_at,
  }));

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const start = (currentPage - 1) * normalizedPageSize;
  const end = start + normalizedPageSize;

  return {
    items: filtered.slice(start, end),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
    filter,
  };
}

export async function getAdminGuestOrdersPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    filter,
    month,
    page,
    pageSize,
  }: {
    filter: AdminGuestOrderFilter;
    month?: string;
    page: number;
    pageSize: number;
  }
): Promise<AdminGuestOrdersPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);
  const normalizedMonth = normalizeAdminMonthKey(month);
  const monthRange = getSeoulMonthUtcRange(normalizedMonth);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
      filter,
      month: normalizedMonth,
    };
  }

  const adminSupabase = createSupabaseAdminClient();
  let query = adminSupabase
    .from("guest_orders")
    .select("id, status, buyer_name, buyer_phone, order_payload, created_at, confirmed_at, canceled_at", { count: "exact" })
    .eq("tenant_id", tenant.id)
    .gte("created_at", monthRange.start)
    .lt("created_at", monthRange.end)
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const from = (normalizedPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;
  const { data, count } = await query.range(from, to).returns<
    Array<{
      id: string;
      status: string;
      buyer_name: string;
      buyer_phone: string;
      order_payload: Record<string, unknown> | null;
      created_at: string;
      confirmed_at: string | null;
      canceled_at: string | null;
    }>
  >();

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      status: isGuestOrderStatus(row.status) ? row.status : "pending",
      buyer_name: row.buyer_name.trim(),
      buyer_phone: row.buyer_phone.trim(),
      order_payload: row.order_payload ?? {},
      created_at: row.created_at,
      confirmed_at: row.confirmed_at,
      canceled_at: row.canceled_at,
    })),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
    filter,
    month: normalizedMonth,
  };
}

export async function getAdminGuestOrderCouponsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    page,
    pageSize,
  }: {
    page: number;
    pageSize: number;
  }
): Promise<AdminGuestOrderCouponsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const adminSupabase = createSupabaseAdminClient();
  const from = (normalizedPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;
  const { data, count } = await adminSupabase
    .from("guest_order_coupons")
    .select("id, code, discount_type, discount_value, is_active, starts_at, ends_at, usage_limit, used_count, created_at, updated_at", {
      count: "exact",
    })
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<
      Array<{
        id: string;
        code: string;
        discount_type: string;
        discount_value: number;
        is_active: boolean;
        starts_at: string | null;
        ends_at: string | null;
        usage_limit: number | null;
        used_count: number;
        created_at: string;
        updated_at: string;
      }>
    >();

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);

  return {
    items: (data ?? []).map((row) => ({
      ...row,
      discount_type: isGuestOrderCouponDiscountType(row.discount_type) ? row.discount_type : "amount",
    })),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminPartnerDiscountCodesPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    page,
    pageSize,
  }: {
    page: number;
    pageSize: number;
  }
): Promise<AdminPartnerDiscountCodesPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      programs: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const adminSupabase = createSupabaseAdminClient();
  const from = (normalizedPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;
  const [{ data, count }, { data: programs }] = await Promise.all([
    adminSupabase
      .from("partner_discount_codes")
      .select(
        "id, brand_name, brand_logo_url, title, description, terms_text, use_url, code_text, visibility_scope, program_id, mobile_visibility, is_active, display_order, starts_at, ends_at, created_at, updated_at, program:program_id(title)",
        { count: "exact" }
      )
      .eq("tenant_id", tenant.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<PartnerDiscountCodeQueryRow[]>(),
    adminSupabase
      .from("programs")
      .select("id, title, slogan")
      .eq("tenant_id", tenant.id)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<PartnerDiscountProgramQueryRow[]>(),
  ]);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);

  return {
    items: (data ?? []).map(mapPartnerDiscountCodeRow),
    programs: mapPartnerDiscountProgramOptions(programs),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminPartnerDiscountCodeEditorData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  codeId?: string
): Promise<AdminPartnerDiscountCodeEditorData> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return { code: null, programs: [] };
  }

  const adminSupabase = createSupabaseAdminClient();
  const programsQuery = adminSupabase
    .from("programs")
    .select("id, title, slogan")
    .eq("tenant_id", tenant.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<PartnerDiscountProgramQueryRow[]>();

  if (!codeId) {
    const { data: programs } = await programsQuery;
    return { code: null, programs: mapPartnerDiscountProgramOptions(programs) };
  }

  const [{ data: code }, { data: programs }] = await Promise.all([
    adminSupabase
      .from("partner_discount_codes")
      .select(
        "id, brand_name, brand_logo_url, title, description, terms_text, use_url, code_text, visibility_scope, program_id, mobile_visibility, is_active, display_order, starts_at, ends_at, created_at, updated_at, program:program_id(title)"
      )
      .eq("tenant_id", tenant.id)
      .eq("id", codeId)
      .maybeSingle<PartnerDiscountCodeQueryRow>(),
    programsQuery,
  ]);

  return {
    code: code ? mapPartnerDiscountCodeRow(code) : null,
    programs: mapPartnerDiscountProgramOptions(programs),
  };
}

function getGuestOrderAmountKrw(payload: Record<string, unknown> | null) {
  if (!payload) {
    return 0;
  }

  const totalAmount = Number(payload.totalAmountKrw);
  if (Number.isFinite(totalAmount) && totalAmount > 0) {
    return Math.floor(totalAmount);
  }

  const monthlyPrice = Number(payload.monthlyPriceKrw);
  const durationMonths = Number(payload.durationMonths);
  if (Number.isFinite(monthlyPrice) && Number.isFinite(durationMonths) && monthlyPrice > 0 && durationMonths > 0) {
    return Math.floor(monthlyPrice * durationMonths);
  }

  return 0;
}

function getKstYearMonthParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  return {
    year: Number.isFinite(year) ? year : date.getUTCFullYear(),
    month: Number.isFinite(month) ? month : date.getUTCMonth() + 1,
  };
}

function getKstMonthKey(date: Date) {
  const { year, month } = getKstYearMonthParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatKstMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
}

function addMonths(year: number, month: number, offset: number) {
  const zeroBased = year * 12 + (month - 1) + offset;
  return {
    year: Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1,
  };
}

function getRecentKstMonthKeys(monthCount: number) {
  const current = getKstYearMonthParts(new Date());
  const first = addMonths(current.year, current.month, -(monthCount - 1));

  return Array.from({ length: monthCount }, (_, index) => {
    const target = addMonths(first.year, first.month, index);
    return `${target.year}-${String(target.month).padStart(2, "0")}`;
  });
}

function kstMonthStartToUtcIso(monthKey: string) {
  const [yearRaw, monthRaw] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  return new Date(Date.UTC(year, month - 1, 1, -9)).toISOString();
}

export async function getAdminGuestOrderRevenuePage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  { range }: { range: AdminGuestOrderRevenueRange }
): Promise<AdminGuestOrderRevenuePage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const normalizedRange: AdminGuestOrderRevenueRange = range === "6" || range === "12" || range === "24" || range === "all" ? range : "12";
  const rangeMonthKeys = normalizedRange === "all" ? [] : getRecentKstMonthKeys(Number(normalizedRange));

  if (!tenant) {
    return {
      range: normalizedRange,
      items: rangeMonthKeys.map((month) => ({
        month,
        label: formatKstMonthLabel(month),
        revenue_krw: 0,
        confirmed_order_count: 0,
        average_order_amount_krw: 0,
      })),
      summary: {
        total_revenue_krw: 0,
        confirmed_order_count: 0,
        monthly_average_revenue_krw: 0,
        average_order_amount_krw: 0,
      },
    };
  }

  const adminSupabase = createSupabaseAdminClient();
  let query = adminSupabase
    .from("guest_orders")
    .select("order_payload, confirmed_at")
    .eq("tenant_id", tenant.id)
    .eq("status", "confirmed")
    .not("confirmed_at", "is", null)
    .order("confirmed_at", { ascending: true });

  if (rangeMonthKeys.length > 0) {
    query = query.gte("confirmed_at", kstMonthStartToUtcIso(rangeMonthKeys[0]));
  }

  const { data, error } = await query.returns<
    Array<{
      order_payload: Record<string, unknown> | null;
      confirmed_at: string | null;
    }>
  >();

  if (error) {
    throw new Error(error.message);
  }

  const monthMap = new Map<string, { revenue: number; orderCount: number }>();
  rangeMonthKeys.forEach((month) => {
    monthMap.set(month, { revenue: 0, orderCount: 0 });
  });

  (data ?? []).forEach((row) => {
    if (!row.confirmed_at) {
      return;
    }

    const amount = getGuestOrderAmountKrw(row.order_payload);
    if (amount <= 0) {
      return;
    }

    const month = getKstMonthKey(new Date(row.confirmed_at));
    const current = monthMap.get(month) ?? { revenue: 0, orderCount: 0 };
    monthMap.set(month, {
      revenue: current.revenue + amount,
      orderCount: current.orderCount + 1,
    });
  });

  const monthKeys = normalizedRange === "all" ? Array.from(monthMap.keys()).sort() : rangeMonthKeys;
  const items = monthKeys.map((month) => {
    const item = monthMap.get(month) ?? { revenue: 0, orderCount: 0 };
    return {
      month,
      label: formatKstMonthLabel(month),
      revenue_krw: item.revenue,
      confirmed_order_count: item.orderCount,
      average_order_amount_krw: item.orderCount > 0 ? Math.round(item.revenue / item.orderCount) : 0,
    };
  });

  const totalRevenue = items.reduce((sum, item) => sum + item.revenue_krw, 0);
  const confirmedOrderCount = items.reduce((sum, item) => sum + item.confirmed_order_count, 0);
  const activeMonthCount = items.filter((item) => item.confirmed_order_count > 0).length;

  return {
    range: normalizedRange,
    items,
    summary: {
      total_revenue_krw: totalRevenue,
      confirmed_order_count: confirmedOrderCount,
      monthly_average_revenue_krw: activeMonthCount > 0 ? Math.round(totalRevenue / activeMonthCount) : 0,
      average_order_amount_krw: confirmedOrderCount > 0 ? Math.round(totalRevenue / confirmedOrderCount) : 0,
    },
  };
}

function isProgramApplicationStatus(value: string): value is ProgramApplicationStatus {
  return value === "pending" || value === "approved" || value === "rejected" || value === "canceled";
}

function normalizeAdminSearchQuery(query: string | undefined) {
  return query?.trim().toLowerCase() ?? "";
}

function includesAdminSearch(value: string | null | undefined, query: string) {
  return query.length === 0 || String(value ?? "").toLowerCase().includes(query);
}

export async function getAdminProgramApplicationsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    query,
    programId,
    filter,
    page,
    pageSize,
  }: {
    query?: string;
    programId?: string | null;
    filter: AdminProgramApplicationFilter;
    page: number;
    pageSize: number;
  }
): Promise<AdminProgramApplicationsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
      filter,
    };
  }

  const searchQuery = normalizeAdminSearchQuery(query);
  let applicationsQuery = supabase
    .from("program_applications")
    .select("id, program_id, user_id, status, created_at, updated_at, program:program_id(title)")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (filter !== "all") {
    applicationsQuery = applicationsQuery.eq("status", filter);
  }

  if (programId) {
    applicationsQuery = applicationsQuery.eq("program_id", programId);
  }

  const { data: applications } = await applicationsQuery.returns<
    Array<{
      id: string;
      program_id: string;
      user_id: string;
      status: string;
      created_at: string;
      updated_at: string;
      program: { title: string | null } | null;
    }>
  >();

  const userIds = [...new Set((applications ?? []).map((application) => application.user_id))];
  const adminSupabase = createSupabaseAdminClient();
  const [tenantProfiles, globalProfiles, authUsers] = await Promise.all([
    listTenantUserProfiles(supabase, tenant.id, userIds),
    userIds.length === 0
      ? Promise.resolve([] as Array<{ id: string; full_name: string | null; avatar_url: string | null }>)
      : supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds)
          .returns<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>()
          .then(({ data }) => data ?? []),
    Promise.all(
      userIds.map(async (userId) => {
        const { data } = await adminSupabase.auth.admin.getUserById(userId);
        return data.user;
      })
    ),
  ]);

  const tenantProfileMap = new Map(tenantProfiles.map((profile) => [profile.user_id, profile]));
  const globalProfileMap = new Map(globalProfiles.map((profile) => [profile.id, profile]));
  const authUserMap = new Map(
    authUsers
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .map((user) => [user.id, user])
  );

  const items = (applications ?? [])
    .map((application) => {
      const authUser = authUserMap.get(application.user_id);
      return {
        id: application.id,
        program_id: application.program_id,
        program_title: application.program?.title?.trim() || "프로그램",
        user_id: application.user_id,
        user_name: resolveTenantDisplayName(
          tenantProfileMap.get(application.user_id),
          globalProfileMap.get(application.user_id),
          authUser,
          "회원"
        ),
        user_email: authUser?.email?.trim() ?? "",
        user_phone_number: tenantProfileMap.get(application.user_id)?.phone_number ?? null,
        user_avatar_url: resolveTenantAvatarUrl(tenantProfileMap.get(application.user_id), globalProfileMap.get(application.user_id), authUser),
        status: isProgramApplicationStatus(application.status) ? application.status : "pending",
        created_at: application.created_at,
        updated_at: application.updated_at,
      };
    })
    .filter(
      (application) =>
        searchQuery.length === 0 ||
        includesAdminSearch(application.user_name, searchQuery) ||
        includesAdminSearch(application.user_email, searchQuery) ||
        includesAdminSearch(application.user_phone_number, searchQuery) ||
        includesAdminSearch(application.program_title, searchQuery)
    );
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;

  return {
    items: items.slice(from, from + normalizedPageSize),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
    filter,
  };
}

export async function getAdminMembershipGrantUsersPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    query,
    page,
    pageSize,
  }: {
    query?: string;
    page: number;
    pageSize: number;
  }
): Promise<AdminMembershipGrantUsersPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const nowIso = new Date().toISOString();
  const searchQuery = normalizeAdminSearchQuery(query);
  const [{ data: tenantProfileRows }, { data: memberships }, { data: entitlementRows }, { data: applicationRows }, { data: stateRows }] = await Promise.all([
    supabase
      .from("tenant_user_profiles")
      .select("tenant_id, user_id, display_name, phone_number, avatar_url, gender, tenant_status, deactivated_at")
      .eq("tenant_id", tenant.id)
      .returns<TenantProfileRow[]>(),
    supabase
      .from("tenant_memberships")
      .select("user_id, role")
      .eq("tenant_id", tenant.id)
      .returns<Array<{ user_id: string; role: TenantMembershipRole }>>(),
    supabase
      .from("program_entitlements")
      .select("id, user_id, program_id, starts_at, ends_at, is_active, program:program_id(title)")
      .eq("tenant_id", tenant.id)
      .returns<
        Array<{
          id: string;
          user_id: string;
          program_id: string;
          starts_at: string;
          ends_at: string | null;
          is_active: boolean;
          program: { title: string | null } | null;
        }>
      >(),
    supabase
      .from("program_applications")
      .select("id, user_id, program_id, status, created_at, program:program_id(title)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .returns<
        Array<{
          id: string;
          user_id: string;
          program_id: string;
          status: string;
          created_at: string;
          program: { title: string | null } | null;
        }>
      >(),
    supabase
      .from("user_program_states")
      .select("user_id, active_program_id")
      .eq("tenant_id", tenant.id)
      .returns<Array<{ user_id: string; active_program_id: string | null }>>(),
  ]);

  const userIds = [
    ...new Set((tenantProfileRows ?? []).map((profile) => profile.user_id)),
  ].sort((a, b) => a.localeCompare(b));

  const [globalProfiles, authUsers] = await Promise.all([
    userIds.length === 0
      ? Promise.resolve([] as Array<{ id: string; full_name: string | null; avatar_url: string | null }>)
      : supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds)
          .returns<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>()
          .then(({ data }) => data ?? []),
    Promise.all(
      userIds.map(async (userId) => {
        const { data } = await createSupabaseAdminClient().auth.admin.getUserById(userId);
        return data.user;
      })
    ),
  ]);

  const tenantProfileMap = new Map((tenantProfileRows ?? []).map((profile) => [profile.user_id, profile]));
  const globalProfileMap = new Map(globalProfiles.map((profile) => [profile.id, profile]));
  const authUserMap = new Map(
    authUsers
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .map((user) => [user.id, user])
  );
  const membershipRoleByUserId = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
  const currentProgramByUserId = new Map((stateRows ?? []).map((state) => [state.user_id, state.active_program_id]));
  const applicationsByUserId = new Map<string, NonNullable<typeof applicationRows>>();
  for (const application of applicationRows ?? []) {
    applicationsByUserId.set(application.user_id, [...(applicationsByUserId.get(application.user_id) ?? []), application]);
  }
  const entitlementsByUserId = new Map<string, NonNullable<typeof entitlementRows>>();
  for (const entitlement of entitlementRows ?? []) {
    entitlementsByUserId.set(entitlement.user_id, [...(entitlementsByUserId.get(entitlement.user_id) ?? []), entitlement]);
  }

  const items = userIds
    .map((userId) => {
      const authUser = authUserMap.get(userId);
      return {
        user_id: userId,
        user_name: resolveTenantDisplayName(tenantProfileMap.get(userId), globalProfileMap.get(userId), authUser, "회원"),
        user_email: authUser?.email?.trim() ?? "",
        user_phone_number: tenantProfileMap.get(userId)?.phone_number ?? null,
        user_avatar_url: resolveTenantAvatarUrl(tenantProfileMap.get(userId), globalProfileMap.get(userId), authUser),
        created_at: authUser?.created_at ?? "",
        tenant_role: membershipRoleByUserId.get(userId) ?? null,
        current_program_id: currentProgramByUserId.get(userId) ?? null,
        applications: (applicationsByUserId.get(userId) ?? []).map((application) => ({
          id: application.id,
          program_id: application.program_id,
          program_title: application.program?.title?.trim() || "프로그램",
          status: isProgramApplicationStatus(application.status) ? application.status : "pending",
          created_at: application.created_at,
        })),
        entitlements: (entitlementsByUserId.get(userId) ?? [])
          .filter((entitlement) => entitlement.is_active && (!entitlement.ends_at || entitlement.ends_at >= nowIso))
          .map((entitlement) => ({
            id: entitlement.id,
            program_id: entitlement.program_id,
            program_title: entitlement.program?.title?.trim() || "프로그램",
            starts_at: entitlement.starts_at,
            ends_at: entitlement.ends_at,
            is_active: entitlement.is_active,
          })),
      };
    })
    .filter(
      (user) =>
        searchQuery.length === 0 ||
        includesAdminSearch(user.user_name, searchQuery) ||
        includesAdminSearch(user.user_email, searchQuery) ||
        includesAdminSearch(user.user_phone_number, searchQuery) ||
        user.applications.some((application) => includesAdminSearch(application.program_title, searchQuery)) ||
        user.entitlements.some((entitlement) => includesAdminSearch(entitlement.program_title, searchQuery))
    )
    .sort((left, right) => Date.parse(right.created_at || "0") - Date.parse(left.created_at || "0"));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;

  return {
    items: items.slice(from, from + normalizedPageSize),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getSessions(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string, programId: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [];
  }

  const { data } = await supabase
    .from("sessions")
    .select("id, session_date, title, content_html, is_published, publish_at, session_type")
    .eq("tenant_id", tenant.id)
    .eq("program_id", programId)
    .order("session_date", { ascending: true })
    .returns<SessionRow[]>();

  return data ?? [];
}

function toDisplayName(fullName: string | null) {
  const value = fullName?.trim();
  return value && value.length > 0 ? value : "Member";
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

async function getTenantProfileDisplayMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  userIds: string[]
) {
  const normalizedUserIds = [...new Set(userIds.filter(Boolean))];
  if (normalizedUserIds.length === 0) {
    return new Map<string, { name: string; avatarUrl: string | null; hyroxProfile: TenantUserHyroxProfile }>();
  }

  const { data: rows } = await supabase
    .from("tenant_user_profiles")
    .select("user_id, display_name, avatar_url, hyrox_profile")
    .eq("tenant_id", tenantId)
    .in("user_id", normalizedUserIds)
    .returns<Array<{ user_id: string; display_name: string | null; avatar_url: string | null; hyrox_profile: unknown }>>();

  return new Map(
    (rows ?? []).map((profile) => [
      profile.user_id,
      {
        name: toDisplayName(profile.display_name),
        avatarUrl: profile.avatar_url ?? null,
        hyroxProfile: normalizeTenantUserHyroxProfile(profile.hyrox_profile),
      },
    ])
  );
}

export async function getAdminCommunityPosts(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  status: CommunityPostStatus | "all" = "all"
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [] as AdminCommunityPostRow[];
  }

  let query = supabase
    .from("community_posts")
    .select("id, title, author_id, status, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: posts } = await query.returns<
    Array<{
      id: string;
      title: string;
      images: unknown;
      author_id: string;
      status: CommunityPostStatus;
      created_at: string;
    }>
  >();

  const postRows = posts ?? [];
  if (postRows.length === 0) {
    return [] as AdminCommunityPostRow[];
  }

  const postIds = postRows.map((post) => post.id);
  const authorIds = [...new Set(postRows.map((post) => post.author_id))];

  const [profileMap, { data: likes }, { data: comments }] = await Promise.all([
    getTenantProfileDisplayMap(supabase, tenant.id, authorIds),
    supabase
      .from("community_post_likes")
      .select("post_id")
      .eq("tenant_id", tenant.id)
      .in("post_id", postIds)
      .returns<Array<{ post_id: string }>>(),
    supabase
      .from("community_comments")
      .select("post_id")
      .eq("tenant_id", tenant.id)
      .eq("status", "published")
      .in("post_id", postIds)
      .returns<Array<{ post_id: string }>>(),
  ]);

  const likeCountMap = (likes ?? []).reduce<Record<string, number>>((acc, like) => {
    acc[like.post_id] = (acc[like.post_id] ?? 0) + 1;
    return acc;
  }, {});
  const commentCountMap = (comments ?? []).reduce<Record<string, number>>((acc, comment) => {
    acc[comment.post_id] = (acc[comment.post_id] ?? 0) + 1;
    return acc;
  }, {});

  return postRows.map((post) => ({
    id: post.id,
    title: post.title,
    images: toStringArray(post.images),
    author_id: post.author_id,
    author_name: profileMap.get(post.author_id)?.name ?? "Member",
    author_avatar_url: profileMap.get(post.author_id)?.avatarUrl ?? null,
    status: post.status,
    created_at: post.created_at,
    like_count: likeCountMap[post.id] ?? 0,
    comment_count: commentCountMap[post.id] ?? 0,
  }));
}

export async function getAdminCommunityReports(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  status: CommunityReportStatus | "all" = "open"
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [] as AdminCommunityReportRow[];
  }

  let query = supabase
    .from("community_post_reports")
    .select("id, post_id, reporter_id, reason, status, reviewed_by, reviewed_at, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data: reports } = await query.returns<
    Array<{
      id: string;
      post_id: string;
      reporter_id: string;
      reason: string;
      status: CommunityReportStatus;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
    }>
  >();

  const reportRows = reports ?? [];
  if (reportRows.length === 0) {
    return [] as AdminCommunityReportRow[];
  }

  const postIds = [...new Set(reportRows.map((report) => report.post_id))];
  const userIds = [...new Set(reportRows.flatMap((report) => [report.reporter_id, report.reviewed_by].filter(Boolean) as string[]))];

  const [{ data: posts }, profileMap] = await Promise.all([
    supabase
      .from("community_posts")
      .select("id, title")
      .eq("tenant_id", tenant.id)
      .in("id", postIds)
      .returns<Array<{ id: string; title: string }>>(),
    getTenantProfileDisplayMap(supabase, tenant.id, userIds),
  ]);

  const postMap = new Map((posts ?? []).map((post) => [post.id, post.title]));

  return reportRows.map((report) => ({
    id: report.id,
    post_id: report.post_id,
    post_title: postMap.get(report.post_id) ?? "삭제된 게시글",
    reporter_id: report.reporter_id,
    reporter_name: profileMap.get(report.reporter_id)?.name ?? "Member",
    reason: report.reason,
    status: report.status,
    reviewed_by: report.reviewed_by,
    reviewed_by_name: report.reviewed_by ? (profileMap.get(report.reviewed_by)?.name ?? "Member") : null,
    reviewed_at: report.reviewed_at,
    created_at: report.created_at,
  }));
}

type CommunityPageParams<TStatus extends string> = {
  status: TStatus | "all";
  query: string;
  page: number;
  pageSize: number;
};

function normalizePagedParams({ query, page, pageSize }: { query: string; page: number; pageSize: number }) {
  const normalizedQuery = query.trim();
  const normalizedPageSize = [10, 20, 50].includes(pageSize) ? pageSize : 20;
  const normalizedPage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

  return {
    normalizedQuery,
    normalizedPage,
    normalizedPageSize,
  };
}

export async function getAdminCommunityPostsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  { status, query, page, pageSize }: CommunityPageParams<CommunityPostStatus>
): Promise<AdminCommunityPostsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { normalizedQuery, normalizedPage, normalizedPageSize } = normalizePagedParams({ query, page, pageSize });

  let countQuery = supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);

  if (status !== "all") {
    countQuery = countQuery.eq("status", status);
  }

  if (normalizedQuery) {
    countQuery = countQuery.or(`title.ilike.%${normalizedQuery}%,content_html.ilike.%${normalizedQuery}%`);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  let rowsQuery = supabase
    .from("community_posts")
    .select("id, title, content_html, images, author_id, status, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    rowsQuery = rowsQuery.eq("status", status);
  }

  if (normalizedQuery) {
    rowsQuery = rowsQuery.or(`title.ilike.%${normalizedQuery}%,content_html.ilike.%${normalizedQuery}%`);
  }

  const { data: posts } = await rowsQuery.returns<
    Array<{
      id: string;
      title: string;
      content_html: string;
      images: unknown;
      author_id: string;
      status: CommunityPostStatus;
      created_at: string;
    }>
  >();

  const postRows = posts ?? [];
  const postIds = postRows.map((post) => post.id);
  const authorIds = [...new Set(postRows.map((post) => post.author_id))];

  const [profileMap, { data: likes }, { data: comments }] = await Promise.all([
    getTenantProfileDisplayMap(supabase, tenant.id, authorIds),
    postIds.length > 0
      ? supabase
          .from("community_post_likes")
          .select("post_id")
          .eq("tenant_id", tenant.id)
          .in("post_id", postIds)
          .returns<Array<{ post_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
    postIds.length > 0
      ? supabase
          .from("community_comments")
          .select("post_id")
          .eq("tenant_id", tenant.id)
          .eq("status", "published")
          .in("post_id", postIds)
          .returns<Array<{ post_id: string }>>()
      : Promise.resolve({ data: [] as Array<{ post_id: string }> }),
  ]);

  const likeCountMap = (likes ?? []).reduce<Record<string, number>>((acc, like) => {
    acc[like.post_id] = (acc[like.post_id] ?? 0) + 1;
    return acc;
  }, {});
  const commentCountMap = (comments ?? []).reduce<Record<string, number>>((acc, comment) => {
    acc[comment.post_id] = (acc[comment.post_id] ?? 0) + 1;
    return acc;
  }, {});

  return {
    items: postRows.map((post) => ({
      id: post.id,
      title: post.title,
      content_html: post.content_html,
      images: toStringArray(post.images),
      author_id: post.author_id,
      author_name: profileMap.get(post.author_id)?.name ?? "Member",
      author_avatar_url: profileMap.get(post.author_id)?.avatarUrl ?? null,
      status: post.status,
      created_at: post.created_at,
      like_count: likeCountMap[post.id] ?? 0,
      comment_count: commentCountMap[post.id] ?? 0,
    })),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminCommunityReportsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  { status, query, page, pageSize }: CommunityPageParams<CommunityReportStatus>
): Promise<AdminCommunityReportsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { normalizedQuery, normalizedPage, normalizedPageSize } = normalizePagedParams({ query, page, pageSize });

  let countQuery = supabase
    .from("community_post_reports")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  if (status !== "all") {
    countQuery = countQuery.eq("status", status);
  }

  if (normalizedQuery) {
    countQuery = countQuery.ilike("reason", `%${normalizedQuery}%`);
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  let reportsQuery = supabase
    .from("community_post_reports")
    .select("id, post_id, reporter_id, reason, status, reviewed_by, reviewed_at, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    reportsQuery = reportsQuery.eq("status", status);
  }

  if (normalizedQuery) {
    reportsQuery = reportsQuery.ilike("reason", `%${normalizedQuery}%`);
  }

  const { data: reports } = await reportsQuery.returns<
    Array<{
      id: string;
      post_id: string;
      reporter_id: string;
      reason: string;
      status: CommunityReportStatus;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
    }>
  >();

  const reportRows = reports ?? [];
  const postIds = [...new Set(reportRows.map((report) => report.post_id))];
  const userIds = [...new Set(reportRows.flatMap((report) => [report.reporter_id, report.reviewed_by].filter(Boolean) as string[]))];

  const [{ data: posts }, profileMap] = await Promise.all([
    postIds.length > 0
      ? supabase
          .from("community_posts")
          .select("id, title, content_html, status")
          .eq("tenant_id", tenant.id)
          .in("id", postIds)
          .returns<Array<{ id: string; title: string; content_html: string; status: CommunityPostStatus }>>()
      : Promise.resolve({ data: [] as Array<{ id: string; title: string; content_html: string; status: CommunityPostStatus }> }),
    getTenantProfileDisplayMap(supabase, tenant.id, userIds),
  ]);

  const postMap = new Map((posts ?? []).map((post) => [post.id, post]));

  return {
    items: reportRows.map((report) => {
      const targetPost = postMap.get(report.post_id);
      return {
        id: report.id,
        post_id: report.post_id,
        post_title: targetPost?.title ?? "삭제된 게시글",
        post_content_html: targetPost?.content_html ?? null,
        post_status: targetPost?.status,
        reporter_id: report.reporter_id,
        reporter_name: profileMap.get(report.reporter_id)?.name ?? "Member",
        reason: report.reason,
        status: report.status,
        reviewed_by: report.reviewed_by,
        reviewed_by_name: report.reviewed_by ? (profileMap.get(report.reviewed_by)?.name ?? "Member") : null,
        reviewed_at: report.reviewed_at,
        created_at: report.created_at,
      } satisfies AdminCommunityReportRow;
    }),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminProgramSessionReviewsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    status,
    query,
    page,
    pageSize,
    date,
    programId,
  }: CommunityPageParams<ProgramSessionReviewStatus> & { date: string; programId?: string }
): Promise<AdminProgramSessionReviewsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { normalizedQuery, normalizedPage, normalizedPageSize } = normalizePagedParams({ query, page, pageSize });

  let reviewsQuery = supabase
    .from("program_session_reviews")
    .select(
      "id, program_id, session_id, user_id, completion_note, intensity_rpe, heart_rate_bpm, status, coach_feedback, reviewed_by, reviewed_at, created_at, updated_at, session:sessions!program_session_reviews_session_id_fkey(session_date, title, session_type), program:programs!program_session_reviews_program_id_fkey(title)"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (status !== "all") {
    reviewsQuery = reviewsQuery.eq("status", status);
  }

  if (programId) {
    reviewsQuery = reviewsQuery.eq("program_id", programId);
  }

  const { data: reviews } = await reviewsQuery.returns<
    Array<{
      id: string;
      program_id: string;
      session_id: string;
      user_id: string;
      completion_note: string;
      intensity_rpe: number | null;
      heart_rate_bpm: number | null;
      status: ProgramSessionReviewStatus;
      coach_feedback: string;
      reviewed_by: string | null;
      reviewed_at: string | null;
      created_at: string;
      updated_at: string;
      session:
        | {
            session_date: string;
            title: string;
            session_type: SessionType | null;
          }
        | null;
      program:
        | {
            title: string | null;
          }
        | null;
    }>
  >();

  const reviewRows = (reviews ?? []).filter((review) => review.session && review.session.session_date === date);
  const profileIds = [...new Set(reviewRows.flatMap((review) => [review.user_id, review.reviewed_by].filter(Boolean) as string[]))];

  const profileMap = await getTenantProfileDisplayMap(supabase, tenant.id, profileIds);

  const mapped = reviewRows.map((review) => {
    const userProfile = profileMap.get(review.user_id);
    const reviewerProfile = review.reviewed_by ? profileMap.get(review.reviewed_by) : null;

    return {
      id: review.id,
      program_id: review.program_id,
      program_title: review.program?.title?.trim() || "프로그램",
      session_id: review.session_id,
      session_date: review.session?.session_date ?? date,
      session_title: review.session?.title?.trim() || "세션",
      session_type: review.session?.session_type ?? "training",
      user_id: review.user_id,
      user_name: userProfile?.name ?? "Member",
      user_avatar_url: userProfile?.avatarUrl ?? null,
      hyrox_profile: userProfile?.hyroxProfile ?? {},
      completion_note: review.completion_note,
      intensity_rpe: review.intensity_rpe,
      heart_rate_bpm: review.heart_rate_bpm,
      status: review.status,
      coach_feedback: review.coach_feedback,
      reviewed_by: review.reviewed_by,
      reviewed_by_name: review.reviewed_by ? (reviewerProfile?.name ?? "Member") : null,
      reviewed_at: review.reviewed_at,
      created_at: review.created_at,
      updated_at: review.updated_at,
    } satisfies AdminProgramSessionReviewRow;
  });

  const filtered = normalizedQuery
    ? mapped.filter((review) => {
        const haystack = [review.user_name, review.program_title, review.session_title, review.completion_note, review.coach_feedback]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedQuery.toLowerCase());
      })
    : mapped;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize;

  return {
    items: filtered.slice(from, to),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminProgramSessionReviewsCalendarData(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    selectedDate,
    rangeStart,
    rangeEnd,
  }: {
    selectedDate: string;
    rangeStart: string;
    rangeEnd: string;
  }
): Promise<AdminProgramSessionReviewsCalendarData> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      items: [],
      summaries: [],
      selectedDate,
      rangeStart,
      rangeEnd,
    };
  }

  const queryRangeStart = selectedDate < rangeStart ? selectedDate : rangeStart;
  const queryRangeEnd = selectedDate > rangeEnd ? selectedDate : rangeEnd;

  const { data: sessionRows } = await supabase
    .from("sessions")
    .select("id, session_date, title, session_type")
    .eq("tenant_id", tenant.id)
    .gte("session_date", queryRangeStart)
    .lte("session_date", queryRangeEnd)
    .returns<Array<{ id: string; session_date: string; title: string; session_type: SessionType | null }>>();

  const sessions = sessionRows ?? [];
  if (sessions.length === 0) {
    return {
      items: [],
      summaries: [],
      selectedDate,
      rangeStart,
      rangeEnd,
    };
  }

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const { data: reviews } = await supabase
    .from("program_session_reviews")
    .select(
      "id, program_id, session_id, user_id, completion_note, intensity_rpe, heart_rate_bpm, status, coach_feedback, reviewed_by, reviewed_at, created_at, updated_at, program:programs!program_session_reviews_program_id_fkey(title)"
    )
    .eq("tenant_id", tenant.id)
    .in("session_id", sessions.map((session) => session.id))
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        id: string;
        program_id: string;
        session_id: string;
        user_id: string;
        completion_note: string;
        intensity_rpe: number | null;
        heart_rate_bpm: number | null;
        status: ProgramSessionReviewStatus;
        coach_feedback: string;
        reviewed_by: string | null;
        reviewed_at: string | null;
        created_at: string;
        updated_at: string;
        program: { title: string | null } | null;
      }>
    >();

  const reviewRows = reviews ?? [];
  const profileIds = [...new Set(reviewRows.flatMap((review) => [review.user_id, review.reviewed_by].filter(Boolean) as string[]))];
  const profileMap = await getTenantProfileDisplayMap(supabase, tenant.id, profileIds);
  const summaryByDate = new Map<string, AdminProgramSessionReviewsCalendarData["summaries"][number]>();

  const mapped = reviewRows.flatMap((review) => {
    const session = sessionById.get(review.session_id);
    if (!session) {
      return [];
    }

    const summary = summaryByDate.get(session.session_date) ?? {
      date: session.session_date,
      totalCount: 0,
      submittedCount: 0,
      reviewedCount: 0,
    };
    summary.totalCount += 1;
    if (review.status === "submitted") {
      summary.submittedCount += 1;
    } else {
      summary.reviewedCount += 1;
    }
    summaryByDate.set(session.session_date, summary);

    const userProfile = profileMap.get(review.user_id);
    const reviewerProfile = review.reviewed_by ? profileMap.get(review.reviewed_by) : null;

    return [{
      id: review.id,
      program_id: review.program_id,
      program_title: review.program?.title?.trim() || "프로그램",
      session_id: review.session_id,
      session_date: session.session_date,
      session_title: session.title.trim() || "세션",
      session_type: session.session_type ?? "training",
      user_id: review.user_id,
      user_name: userProfile?.name ?? "Member",
      user_avatar_url: userProfile?.avatarUrl ?? null,
      hyrox_profile: userProfile?.hyroxProfile ?? {},
      completion_note: review.completion_note,
      intensity_rpe: review.intensity_rpe,
      heart_rate_bpm: review.heart_rate_bpm,
      status: review.status,
      coach_feedback: review.coach_feedback,
      reviewed_by: review.reviewed_by,
      reviewed_by_name: review.reviewed_by ? (reviewerProfile?.name ?? "Member") : null,
      reviewed_at: review.reviewed_at,
      created_at: review.created_at,
      updated_at: review.updated_at,
    } satisfies AdminProgramSessionReviewRow];
  });

  return {
    items: mapped.filter((review) => review.session_date === selectedDate),
    summaries: [...summaryByDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    selectedDate,
    rangeStart,
    rangeEnd,
  };
}

export async function getAdminLegalDocuments(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const result = await getAdminLegalDocumentsPage(supabase, tenantSlug, { page: 1, pageSize: 50 });
  return result.items;
}

export async function getAdminLegalDocumentsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  { page, pageSize }: { page: number; pageSize: number }
): Promise<AdminLegalDocumentsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const { count } = await supabase
    .from("legal_documents")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data } = await supabase
    .from("legal_documents")
    .select("id, type, locale, title, version, is_published, published_at, updated_at, created_at")
    .eq("tenant_id", tenant.id)
    .order("type", { ascending: true })
    .order("locale", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .range(from, to)
    .returns<
      Array<{
        id: string;
        type: LegalDocumentType;
        locale: LegalDocumentLocale;
        title: string;
        version: string;
        is_published: boolean;
        published_at: string | null;
        updated_at: string;
        created_at: string;
      }>
    >();

  return {
    items: data ?? [],
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminNotices(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const result = await getAdminNoticesPage(supabase, tenantSlug, { page: 1, pageSize: 50 });
  return result.items;
}

export async function getAdminNoticesPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  { page, pageSize }: { page: number; pageSize: number }
): Promise<AdminNoticesPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(page, pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const { count } = await supabase.from("notices").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<NoticeRow[]>();

  return {
    items: data ?? [],
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminNoticeById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  id: string
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<NoticeRow>();

  return data ?? null;
}

export async function getPublishedNotices(tenantSlug: string, limit?: number) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [];
  }

  let query = supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data } = await query.returns<NoticeRow[]>();
  return data ?? [];
}

export async function getPublishedNoticeById(tenantSlug: string, id: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("notices")
    .select("id, title, content_html, thumbnail_url, is_published, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle<NoticeRow>();

  return data ?? null;
}

function attachOfflineClassParticipants(
  classes: OfflineClassRow[],
  registrations: OfflineClassRegistrationRow[]
): OfflineClassWithParticipants[] {
  const registrationByClassId = new Map<string, OfflineClassRegistrationRow[]>();

  registrations.forEach((registration) => {
    const rows = registrationByClassId.get(registration.class_id) ?? [];
    rows.push(registration);
    registrationByClassId.set(registration.class_id, rows);
  });

  return classes.map((offlineClass) => ({
    ...offlineClass,
    participants: registrationByClassId.get(offlineClass.id) ?? [],
  }));
}

export async function getPublishedOfflineClasses({
  tenantSlug,
  limit,
  upcomingOnly = false,
}: {
  tenantSlug: string;
  limit?: number;
  upcomingOnly?: boolean;
}) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return { classes: [] as OfflineClassWithParticipants[], currentUserId: null as string | null };
  }

  let query = supabase
    .from("offline_classes")
    .select(
      "id, title, subtitle, content_html, location_text, address_text, starts_at, ends_at, registration_opens_at, registration_closes_at, cancellation_closes_at, capacity, status, is_published, thumbnail_url, mobile_visibility, coach_profile_id, coach_profile:coach_profiles(id, display_name, image_url), created_by, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .eq("is_published", true)
    .eq("mobile_visibility", "public")
    .order("starts_at", { ascending: true });

  if (upcomingOnly) {
    query = query.gt("starts_at", new Date().toISOString());
  }

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data: classes } = await query.returns<OfflineClassRow[]>();
  const classRows = classes ?? [];

  const classIds = classRows.map((row) => row.id);
  if (classIds.length === 0) {
    return { classes: [] as OfflineClassWithParticipants[], currentUserId: null as string | null };
  }

  const [{ data: registrations }, userRes] = await Promise.all([
    supabase
      .from("offline_class_registrations")
      .select("id, class_id, user_id, participant_name, status, confirmed_at, confirmed_by, reviewed_at, reviewed_by, created_at")
      .eq("tenant_id", tenant.id)
      .in("class_id", classIds)
      .order("created_at", { ascending: true })
      .returns<OfflineClassRegistrationRow[]>(),
    supabase.auth.getUser(),
  ]);

  const currentUserId = userRes.data.user?.id ?? null;

  return {
    classes: attachOfflineClassParticipants(classRows, registrations ?? []),
    currentUserId,
  };
}

export async function getPublishedOfflineClassById(tenantSlug: string, id: string) {
  const supabase = await createSupabaseServerClient();
  const tenant = await getTenantBySlug(supabase, tenantSlug);

  if (!tenant) {
    return null;
  }

  const [classRes, userRes] = await Promise.all([
    supabase
      .from("offline_classes")
      .select(
        "id, title, subtitle, content_html, location_text, address_text, starts_at, ends_at, registration_opens_at, registration_closes_at, cancellation_closes_at, capacity, status, is_published, thumbnail_url, mobile_visibility, coach_profile_id, coach_profile:coach_profiles(id, display_name, image_url), created_by, created_at, updated_at"
      )
      .eq("tenant_id", tenant.id)
      .eq("id", id)
      .eq("is_published", true)
      .eq("mobile_visibility", "public")
      .maybeSingle<OfflineClassRow>(),
    supabase.auth.getUser(),
  ]);

  if (!classRes.data) {
    return null;
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, status, confirmed_at, confirmed_by, reviewed_at, reviewed_by, created_at")
    .eq("tenant_id", tenant.id)
    .eq("class_id", id)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  const [offlineClass] = attachOfflineClassParticipants([classRes.data], registrations ?? []);

  return {
    offlineClass,
    currentUserId: userRes.data.user?.id ?? null,
  };
}

export async function getAdminOfflineClasses(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [] as OfflineClassWithParticipants[];
  }

  const { data: classes } = await supabase
    .from("offline_classes")
    .select(
      "id, title, subtitle, content_html, location_text, address_text, starts_at, ends_at, registration_opens_at, registration_closes_at, cancellation_closes_at, capacity, status, is_published, thumbnail_url, mobile_visibility, coach_profile_id, coach_profile:coach_profiles(id, display_name, image_url), created_by, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .order("starts_at", { ascending: true })
    .returns<OfflineClassRow[]>();

  const classRows = classes ?? [];
  const classIds = classRows.map((row) => row.id);
  if (classIds.length === 0) {
    return [] as OfflineClassWithParticipants[];
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, status, confirmed_at, confirmed_by, reviewed_at, reviewed_by, created_at")
    .eq("tenant_id", tenant.id)
    .in("class_id", classIds)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  return attachOfflineClassParticipants(classRows, registrations ?? []);
}

export async function getAdminOfflineClassById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  id: string
) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data: offlineClass } = await supabase
    .from("offline_classes")
    .select(
      "id, title, subtitle, content_html, location_text, address_text, starts_at, ends_at, registration_opens_at, registration_closes_at, cancellation_closes_at, capacity, status, is_published, thumbnail_url, mobile_visibility, coach_profile_id, coach_profile:coach_profiles(id, display_name, image_url), created_by, created_at, updated_at"
    )
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<OfflineClassRow>();

  if (!offlineClass) {
    return null;
  }

  const { data: registrations } = await supabase
    .from("offline_class_registrations")
    .select("id, class_id, user_id, participant_name, status, confirmed_at, confirmed_by, reviewed_at, reviewed_by, created_at")
    .eq("tenant_id", tenant.id)
    .eq("class_id", id)
    .order("created_at", { ascending: true })
    .returns<OfflineClassRegistrationRow[]>();

  const [withParticipants] = attachOfflineClassParticipants([offlineClass], registrations ?? []);
  return withParticipants;
}

type TenantProfileRow = {
  tenant_id: string;
  user_id: string;
  display_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  gender: ProfileGender | null;
  tenant_status: "active" | "deactivated" | null;
  deactivated_at: string | null;
  hyrox_profile?: unknown;
};

type AuthUserListItem = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  email_confirmed_at?: string | null;
  invited_at?: string | null;
  last_sign_in_at?: string | null;
  created_at: string;
};

async function listAllAuthUsers() {
  const admin = createSupabaseAdminClient();
  const perPage = 200;
  const result: AuthUserListItem[] = [];
  let page = 1;

  while (true) {
    const usersResult = await admin.auth.admin.listUsers({ page, perPage });
    if (usersResult.error) {
      throw new Error(`Failed to list auth users: ${usersResult.error.message}`);
    }

    const users = (usersResult.data?.users ?? []) as AuthUserListItem[];
    result.push(...users);

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return result;
}

function buildManagedUserRow(
  authUser: AuthUserListItem,
  tenantProfile: TenantProfileRow | undefined,
  role: TenantMembershipRole,
  hasMembership: boolean
): ManagedUserRow {
  return {
    id: authUser.id,
    email: authUser.email ?? "",
    full_name: resolveTenantDisplayName(tenantProfile, null, authUser, "미등록 사용자"),
    phone_number: tenantProfile?.phone_number?.trim() || null,
    avatar_url: resolveTenantAvatarUrl(tenantProfile, null, authUser),
    gender: tenantProfile?.gender ?? null,
    account_status: tenantProfile?.tenant_status === "deactivated" ? "deactivated" : "active",
    deactivated_at: tenantProfile?.deactivated_at ?? null,
    role,
    has_membership: hasMembership,
    email_confirmed: !!authUser.email_confirmed_at,
    invited_at: authUser.invited_at ?? null,
    last_sign_in_at: authUser.last_sign_in_at ?? null,
    created_at: authUser.created_at,
    hyrox_profile: normalizeTenantUserHyroxProfile(tenantProfile?.hyrox_profile),
  };
}

function normalizeTenantUserHyroxProfile(value: unknown): TenantUserHyroxProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const profile = value as Record<string, unknown>;
  const isXonMember = profile.is_xon_member;
  const hyroxDivision = profile.hyrox_division;
  const hasHyroxRaceExperience = profile.has_hyrox_race_experience;
  const hyroxGoal = profile.hyrox_goal;

  return {
    is_xon_member: typeof isXonMember === "boolean" ? isXonMember : isXonMember === null ? null : undefined,
    hyrox_division: typeof hyroxDivision === "string" ? hyroxDivision : hyroxDivision === null ? null : undefined,
    has_hyrox_race_experience:
      typeof hasHyroxRaceExperience === "boolean" ? hasHyroxRaceExperience : hasHyroxRaceExperience === null ? null : undefined,
    hyrox_goal: typeof hyroxGoal === "string" ? hyroxGoal : hyroxGoal === null ? null : undefined,
  };
}

export async function getAdminManagedUsers(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [] as ManagedUserRow[];
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant.id)
    .returns<Array<{ user_id: string; role: TenantMembershipRole }>>();

  const memberIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  const memberRoleById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
  if (memberIds.length === 0) {
    return [] as ManagedUserRow[];
  }

  const [tenantProfileRows, authUsersAll] = await Promise.all([
    listTenantUserProfiles(supabase, tenant.id, memberIds),
    listAllAuthUsers(),
  ]);

  const tenantProfileById = new Map(tenantProfileRows.map((profile) => [profile.user_id, profile]));
  const authUsers = authUsersAll.filter((authUser) => memberIds.includes(authUser.id));

  const mergedUsers: ManagedUserRow[] = authUsers.map((authUser) =>
    buildManagedUserRow(
      authUser,
      tenantProfileById.get(authUser.id),
      memberRoleById.get(authUser.id) ?? "member",
      true
    )
  );

  return mergedUsers.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getAdminDeactivatedAccounts(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, tenantSlug: string) {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [] as AdminDeactivatedAccountRow[];
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant.id)
    .returns<Array<{ user_id: string; role: TenantMembershipRole }>>();

  const memberIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  if (memberIds.length === 0) {
    return [] as AdminDeactivatedAccountRow[];
  }

  const { data: deactivatedProfiles } = await supabase
    .from("tenant_user_profiles")
    .select("user_id, display_name, deactivated_at")
    .eq("tenant_id", tenant.id)
    .in("user_id", memberIds)
    .eq("tenant_status", "deactivated")
    .not("deactivated_at", "is", null)
    .order("deactivated_at", { ascending: false })
    .returns<Array<{ user_id: string; display_name: string | null; deactivated_at: string }>>();

  const profileRows = deactivatedProfiles ?? [];
  if (profileRows.length === 0) {
    return [] as AdminDeactivatedAccountRow[];
  }

  const authUsers = await listAllAuthUsers();
  const authUserById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const memberRoleById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));

  return profileRows.map((profile) => {
    const authUser = authUserById.get(profile.user_id);
    const fullName = resolveTenantDisplayName(
      { display_name: profile.display_name },
      null,
      authUser,
      "미등록 사용자"
    );

    return {
      id: profile.user_id,
      email: authUser?.email ?? "",
      full_name: fullName,
      role: memberRoleById.get(profile.user_id) ?? "member",
      deactivated_at: profile.deactivated_at,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
    } satisfies AdminDeactivatedAccountRow;
  });
}

function compareNullableDate(a: string | null, b: string | null, order: "asc" | "desc") {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const aTime = Date.parse(a);
  const bTime = Date.parse(b);
  return order === "asc" ? aTime - bTime : bTime - aTime;
}

function sortManagedUsers(users: ManagedUserRow[], sortBy: ManagedUserSortBy, order: "asc" | "desc") {
  const copied = [...users];

  copied.sort((a, b) => {
    if (sortBy === "full_name") {
      const compared = a.full_name.localeCompare(b.full_name, "ko");
      return order === "asc" ? compared : -compared;
    }

    if (sortBy === "last_sign_in_at") {
      return compareNullableDate(a.last_sign_in_at, b.last_sign_in_at, order);
    }

    const aTime = Date.parse(a.created_at);
    const bTime = Date.parse(b.created_at);
    return order === "asc" ? aTime - bTime : bTime - aTime;
  });

  return copied;
}

function normalizePhoneSearchValue(value: string) {
  return value.replace(/\D/g, "");
}

function matchesManagedUserQuery(user: ManagedUserRow, normalizedQuery: string, normalizedPhoneQuery: string) {
  const target = `${user.full_name} ${user.email} ${user.phone_number ?? ""}`.toLowerCase();
  if (target.includes(normalizedQuery)) {
    return true;
  }

  const normalizedUserPhone = normalizePhoneSearchValue(user.phone_number ?? "");
  return Boolean(normalizedPhoneQuery && normalizedUserPhone.includes(normalizedPhoneQuery));
}

function getAdminMembershipStatus({
  startsAt,
  endsAt,
  isActive,
  nowTimestamp,
}: {
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  nowTimestamp: number;
}): AdminMembershipStatus {
  if (!isActive) {
    return "inactive";
  }

  if (Date.parse(startsAt) > nowTimestamp) {
    return "pending";
  }

  if (!endsAt || Date.parse(endsAt) >= nowTimestamp) {
    return "active";
  }

  return "expired";
}

export async function getAdminManagedUsersPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    query,
    sortBy,
    order,
    page,
    pageSize,
  }: {
    query: string;
    sortBy: ManagedUserSortBy;
    order: "asc" | "desc";
    page: number;
    pageSize: number;
  }
): Promise<ManagedUsersPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("user_id, role")
    .eq("tenant_id", tenant.id)
    .returns<Array<{ user_id: string; role: TenantMembershipRole }>>();

  const memberIds = [...new Set((memberships ?? []).map((membership) => membership.user_id))];
  const memberRoleById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
  if (memberIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const [tenantProfileRows, authUsersAll] = await Promise.all([
    listTenantUserProfiles(supabase, tenant.id, memberIds),
    listAllAuthUsers(),
  ]);

  const tenantProfileById = new Map(tenantProfileRows.map((profile) => [profile.user_id, profile]));
  const authUsers = authUsersAll.filter((authUser) => memberIds.includes(authUser.id));

  const mergedUsers: ManagedUserRow[] = authUsers.map((authUser) =>
    buildManagedUserRow(
      authUser,
      tenantProfileById.get(authUser.id),
      memberRoleById.get(authUser.id) ?? "member",
      true
    )
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? mergedUsers.filter((user) => {
        return matchesManagedUserQuery(user, normalizedQuery, normalizePhoneSearchValue(normalizedQuery));
      })
    : mergedUsers;

  const sorted = sortManagedUsers(filtered, sortBy, order);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: sorted.slice(start, end),
    total,
    page: normalizedPage,
    pageSize,
    totalPages,
  };
}

export async function getAdminAllUsersPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    query,
    programId,
    sortBy,
    order,
    page,
    pageSize,
  }: {
    query: string;
    programId: string | null;
    sortBy: ManagedUserSortBy;
    order: "asc" | "desc";
    page: number;
    pageSize: number;
  }
): Promise<ManagedUsersPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const [{ data: memberships }, authUsersAll, { data: entitlementUserRows }, { data: programStateUserRows }, { data: workoutRecordUserRows }] = await Promise.all([
    supabase
      .from("tenant_memberships")
      .select("user_id, role")
      .eq("tenant_id", tenant.id)
      .returns<Array<{ user_id: string; role: TenantMembershipRole }>>(),
    listAllAuthUsers(),
    supabase.from("program_entitlements").select("user_id").eq("tenant_id", tenant.id).returns<Array<{ user_id: string }>>(),
    supabase.from("user_program_states").select("user_id").eq("tenant_id", tenant.id).returns<Array<{ user_id: string }>>(),
    supabase.from("user_workout_records_v2").select("user_id").eq("tenant_id", tenant.id).returns<Array<{ user_id: string }>>(),
  ]);

  const memberRoleById = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
  const { data: tenantProfileRows } = await supabase
    .from("tenant_user_profiles")
    .select("tenant_id, user_id, display_name, phone_number, avatar_url, gender, tenant_status, deactivated_at, hyrox_profile")
    .eq("tenant_id", tenant.id)
    .returns<TenantProfileRow[]>();

  const candidateUserIds = [
    ...new Set([
      ...(tenantProfileRows ?? []).map((profile) => profile.user_id),
      ...(memberships ?? []).map((membership) => membership.user_id),
      ...(entitlementUserRows ?? []).map((row) => row.user_id),
      ...(programStateUserRows ?? []).map((row) => row.user_id),
      ...(workoutRecordUserRows ?? []).map((row) => row.user_id),
    ]),
  ];
  const authUserIds = candidateUserIds;

  const tenantProfileById = new Map((tenantProfileRows ?? []).map((profile) => [profile.user_id, profile]));
  const authUsers = authUsersAll.filter((authUser) => authUserIds.includes(authUser.id));

  let selectedProgramUserIds: Set<string> | null = null;
  if (programId) {
    const { data: selectedProgramEntitlementRows } = await supabase
      .from("program_entitlements")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .eq("program_id", programId)
      .order("starts_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<Array<{ user_id: string }>>();

    selectedProgramUserIds = new Set((selectedProgramEntitlementRows ?? []).map((row) => row.user_id));
  }

  const mergedUsers: ManagedUserRow[] = authUsers.map((authUser) => {
    const membershipRole = memberRoleById.get(authUser.id);

    return buildManagedUserRow(
      authUser,
      tenantProfileById.get(authUser.id),
      membershipRole ?? "member",
      Boolean(membershipRole)
    );
  });

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedPhoneQuery = normalizePhoneSearchValue(normalizedQuery);
  const programFiltered = selectedProgramUserIds
    ? mergedUsers.filter((user) => selectedProgramUserIds.has(user.id))
    : mergedUsers;

  const filtered = normalizedQuery
    ? programFiltered.filter((user) => {
        return matchesManagedUserQuery(user, normalizedQuery, normalizedPhoneQuery);
      })
    : programFiltered;

  const sorted = sortManagedUsers(filtered, sortBy, order);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * pageSize;
  const end = start + pageSize;
  const pagedItems = sorted.slice(start, end);

  if (pagedItems.length === 0) {
    return {
      items: pagedItems,
      total,
      page: normalizedPage,
      pageSize,
      totalPages,
    };
  }

  const pagedUserIds = pagedItems.map((user) => user.id);
  const [{ data: entitlementRows }, { data: programRows }, { data: programStateRows }] = await Promise.all([
    supabase
      .from("program_entitlements")
      .select("id, user_id, program_id, cohort_id, starts_at, ends_at, is_active, created_at, cohort:cohort_id(name, starts_on)")
      .eq("tenant_id", tenant.id)
      .in("user_id", pagedUserIds)
      .order("starts_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<
        Array<{
          id: string;
          user_id: string;
          program_id: string;
          cohort_id: string | null;
          cohort: { name: string | null; starts_on: string | null } | null;
          starts_at: string;
          ends_at: string | null;
          is_active: boolean;
          created_at: string;
        }>
      >(),
    supabase.from("programs").select("id, title").eq("tenant_id", tenant.id).returns<Array<{ id: string; title: string }>>(),
    supabase
      .from("user_program_states")
      .select("user_id, active_program_id")
      .eq("tenant_id", tenant.id)
      .in("user_id", pagedUserIds)
      .returns<Array<{ user_id: string; active_program_id: string }>>(),
  ]);

  const programTitleById = new Map(
    (programRows ?? []).map((program, index) => [program.id, program.title?.trim() || `프로그램 ${index + 1}`])
  );

  const entitlementsByUserId = new Map<string, ManagedUserProgramEntitlement[]>();
  for (const row of entitlementRows ?? []) {
    const current = entitlementsByUserId.get(row.user_id) ?? [];
    current.push({
      id: row.id,
      program_id: row.program_id,
      program_title: programTitleById.get(row.program_id) ?? "삭제된 프로그램",
      cohort_id: row.cohort_id,
      cohort_name: row.cohort?.name ?? null,
      cohort_starts_on: row.cohort?.starts_on ?? null,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      is_active: row.is_active,
      created_at: row.created_at,
    });
    entitlementsByUserId.set(row.user_id, current);
  }

  const activeProgramIdByUserId = new Map((programStateRows ?? []).map((row) => [row.user_id, row.active_program_id]));

  const items = pagedItems.map((user) => ({
    ...user,
    active_program_id: activeProgramIdByUserId.get(user.id) ?? null,
    program_entitlements: entitlementsByUserId.get(user.id) ?? [],
  }));

  return {
    items,
    total,
    page: normalizedPage,
    pageSize,
    totalPages,
  };
}

export async function getAdminMembershipsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    query,
    programId,
    status,
    page,
    pageSize,
  }: {
    query: string;
    programId: string | null;
    status: AdminMembershipStatusFilter;
    page: number;
    pageSize: number;
  }
): Promise<AdminMembershipsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  let entitlementsQuery = supabase
    .from("program_entitlements")
    .select("id, user_id, program_id, cohort_id, starts_at, ends_at, is_active, created_at, cohort:cohort_id(name, starts_on), program:program_id(title)")
    .eq("tenant_id", tenant.id)
    .order("starts_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (programId) {
    entitlementsQuery = entitlementsQuery.eq("program_id", programId);
  }

  const { data: entitlementRows } = await entitlementsQuery.returns<
    Array<{
      id: string;
      user_id: string;
      program_id: string;
      cohort_id: string | null;
      starts_at: string;
      ends_at: string | null;
      is_active: boolean;
      created_at: string;
      cohort: { name: string | null; starts_on: string | null } | null;
      program: { title: string | null } | null;
    }>
  >();

  const entitlements = entitlementRows ?? [];
  if (entitlements.length === 0) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const userIds = [...new Set(entitlements.map((entitlement) => entitlement.user_id))];
  const [tenantProfileRows, authUsersAll, { data: programStateRows }] = await Promise.all([
    listTenantUserProfiles(supabase, tenant.id, userIds),
    listAllAuthUsers(),
    supabase
      .from("user_program_states")
      .select("user_id, active_program_id")
      .eq("tenant_id", tenant.id)
      .in("user_id", userIds)
      .returns<Array<{ user_id: string; active_program_id: string | null }>>(),
  ]);

  const tenantProfileById = new Map(tenantProfileRows.map((profile) => [profile.user_id, profile]));
  const authUserById = new Map(authUsersAll.filter((authUser) => userIds.includes(authUser.id)).map((authUser) => [authUser.id, authUser]));
  const activeProgramIdByUserId = new Map((programStateRows ?? []).map((row) => [row.user_id, row.active_program_id]));
  const nowTimestamp = Date.now();

  const rows: AdminMembershipRow[] = entitlements.map((entitlement) => {
    const tenantProfile = tenantProfileById.get(entitlement.user_id);
    const authUser = authUserById.get(entitlement.user_id);

    return {
      id: entitlement.id,
      user_id: entitlement.user_id,
      user_name: resolveTenantDisplayName(tenantProfile, null, authUser, "회원"),
      user_email: authUser?.email?.trim() ?? "",
      user_phone_number: tenantProfile?.phone_number?.trim() || null,
      program_id: entitlement.program_id,
      program_title: entitlement.program?.title?.trim() || "삭제된 프로그램",
      cohort_id: entitlement.cohort_id,
      cohort_name: entitlement.cohort?.name ?? null,
      cohort_starts_on: entitlement.cohort?.starts_on ?? null,
      starts_at: entitlement.starts_at,
      ends_at: entitlement.ends_at,
      is_active: entitlement.is_active,
      status: getAdminMembershipStatus({
        startsAt: entitlement.starts_at,
        endsAt: entitlement.ends_at,
        isActive: entitlement.is_active,
        nowTimestamp,
      }),
      is_current_program: activeProgramIdByUserId.get(entitlement.user_id) === entitlement.program_id,
      created_at: entitlement.created_at,
    };
  });

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedPhoneQuery = normalizePhoneSearchValue(normalizedQuery);
  const filtered = rows.filter((row) => {
    if (status !== "all" && row.status !== status) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const target = `${row.user_name} ${row.user_email} ${row.user_phone_number ?? ""}`.toLowerCase();
    if (target.includes(normalizedQuery)) {
      return true;
    }

    return Boolean(normalizedPhoneQuery && normalizePhoneSearchValue(row.user_phone_number ?? "").includes(normalizedPhoneQuery));
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const from = (normalizedPage - 1) * pageSize;
  const to = from + pageSize;

  return {
    items: filtered.slice(from, to),
    total,
    page: normalizedPage,
    pageSize,
    totalPages,
  };
}

type WorkoutExerciseRow = {
  exercise_key: string;
  record_type: "time" | "weight";
  sort_order: number;
  is_active: boolean;
};

type WorkoutPresetRow = {
  exercise_key: string;
  preset_key: string;
  distance_m: number | null;
  target_reps: number | null;
  sort_order: number;
  is_active: boolean;
};

type WorkoutRecordRow = {
  id: string;
  user_id: string;
  preset_key: string | null;
  distance: number | null;
  record_seconds: number | null;
  record_weight_kg: number | null;
  record_reps: number | null;
  recorded_at: string;
};

function sortLeaderboardItems(items: AdminWorkoutLeaderboardItem[], recordType: "time" | "weight") {
  return [...items].sort((a, b) => {
    if (recordType === "time") {
      const aSeconds = a.best_seconds ?? Number.POSITIVE_INFINITY;
      const bSeconds = b.best_seconds ?? Number.POSITIVE_INFINITY;
      if (aSeconds !== bSeconds) {
        return aSeconds - bSeconds;
      }
    } else {
      const aWeight = a.best_weight_kg ?? Number.NEGATIVE_INFINITY;
      const bWeight = b.best_weight_kg ?? Number.NEGATIVE_INFINITY;
      if (aWeight !== bWeight) {
        return bWeight - aWeight;
      }
    }

    const aTime = Date.parse(a.latest_recorded_at);
    const bTime = Date.parse(b.latest_recorded_at);
    if (aTime !== bTime) {
      return aTime - bTime;
    }

    return a.user_id.localeCompare(b.user_id);
  });
}

export async function getAdminWorkoutLeaderboardPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  {
    exerciseKey,
    presetKey,
    gender,
    page,
    pageSize,
  }: {
    exerciseKey?: string;
    presetKey?: string;
    gender?: ProfileGender | "all";
    page: number;
    pageSize: number;
  }
): Promise<AdminWorkoutLeaderboardPage> {
  const selectedGender = gender && isProfileGender(gender) ? gender : "all";

  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return {
      exerciseOptions: [],
      presetOptions: [],
      selectedExerciseKey: "",
      selectedPresetKey: "",
      selectedGender,
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const { data: exerciseRows } = await supabase
    .from("workout_exercises")
    .select("exercise_key, record_type, sort_order, is_active")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<WorkoutExerciseRow[]>();

  const exerciseOptions: AdminWorkoutExerciseOption[] = (exerciseRows ?? []).map((row) => ({
      exercise_key: row.exercise_key,
      record_type: row.record_type,
      sort_order: row.sort_order,
    }));

  if (exerciseOptions.length === 0) {
    return {
      exerciseOptions,
      presetOptions: [],
      selectedExerciseKey: "",
      selectedPresetKey: "",
      selectedGender,
      items: [],
      total: 0,
      page: 1,
      pageSize,
      totalPages: 1,
    };
  }

  const selectedExerciseKey =
    exerciseOptions.find((option) => option.exercise_key === exerciseKey)?.exercise_key ??
    exerciseOptions.find((option) => option.exercise_key === "rowing")?.exercise_key ??
    exerciseOptions[0].exercise_key;
  const selectedExercise = exerciseOptions.find((option) => option.exercise_key === selectedExerciseKey) ?? exerciseOptions[0];
  const selectedRecordType = selectedExercise.record_type;

  const { data: presetRows } = await supabase
    .from("workout_exercise_presets")
    .select("exercise_key, preset_key, distance_m, target_reps, sort_order, is_active")
    .eq("tenant_id", tenant.id)
    .eq("exercise_key", selectedExerciseKey)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .returns<WorkoutPresetRow[]>();

  const presetOptions: AdminWorkoutPresetOption[] = (presetRows ?? []).map((row) => ({
    exercise_key: row.exercise_key,
    preset_key: row.preset_key,
    distance_m: row.distance_m,
    target_reps: row.target_reps,
    sort_order: row.sort_order,
  }));

  const selectedPresetKey =
    presetOptions.find((option) => option.preset_key === presetKey)?.preset_key ??
    (selectedRecordType === "time"
      ? presetOptions.find((option) => option.preset_key === "2000m")?.preset_key
      : presetOptions.find((option) => option.preset_key === "1rm")?.preset_key) ??
    presetOptions[0]?.preset_key ??
    "";

  const selectedPreset = presetOptions.find((option) => option.preset_key === selectedPresetKey) ?? null;

  const { data: recordRows } = await supabase
    .from("user_workout_records_v2")
    .select("id, user_id, preset_key, distance, record_seconds, record_weight_kg, record_reps, recorded_at")
    .eq("tenant_id", tenant.id)
    .eq("record_type", selectedRecordType)
    .eq("exercise_key", selectedExerciseKey)
    .returns<WorkoutRecordRow[]>();

  const filteredRows = (recordRows ?? []).filter((row) => {
    if (!selectedPresetKey) {
      return false;
    }

    if (row.preset_key === selectedPresetKey) {
      return true;
    }

    if (!row.preset_key && selectedPreset?.distance_m != null && row.distance != null) {
      return row.distance === selectedPreset.distance_m;
    }

    if (!row.preset_key && selectedPreset?.target_reps != null && row.record_reps != null) {
      return row.record_reps === selectedPreset.target_reps;
    }

    return false;
  });

  const bestByUser = new Map<
    string,
    {
      user_id: string;
      best_seconds: number | null;
      best_weight_kg: number | null;
      latest_recorded_at: string;
    }
  >();

  for (const row of filteredRows) {
    const current = bestByUser.get(row.user_id);
    if (!current) {
      const parsedSeconds = row.record_seconds != null ? Number(row.record_seconds) : null;
      const parsedWeight = row.record_weight_kg != null ? Number(row.record_weight_kg) : null;
      bestByUser.set(row.user_id, {
        user_id: row.user_id,
        best_seconds: selectedRecordType === "time" ? parsedSeconds : null,
        best_weight_kg: selectedRecordType === "weight" ? parsedWeight : null,
        latest_recorded_at: row.recorded_at,
      });
      continue;
    }

    const parsedSeconds = row.record_seconds != null ? Number(row.record_seconds) : null;
    const parsedWeight = row.record_weight_kg != null ? Number(row.record_weight_kg) : null;

    const bestSeconds =
      selectedRecordType === "time"
        ? Math.min(current.best_seconds ?? Number.POSITIVE_INFINITY, parsedSeconds ?? Number.POSITIVE_INFINITY)
        : current.best_seconds;
    const bestWeight =
      selectedRecordType === "weight"
        ? Math.max(current.best_weight_kg ?? Number.NEGATIVE_INFINITY, parsedWeight ?? Number.NEGATIVE_INFINITY)
        : current.best_weight_kg;
    const latestRecordedAt = Date.parse(current.latest_recorded_at) >= Date.parse(row.recorded_at)
      ? current.latest_recorded_at
      : row.recorded_at;

    bestByUser.set(row.user_id, {
      user_id: row.user_id,
      best_seconds: selectedRecordType === "time" ? bestSeconds : null,
      best_weight_kg: selectedRecordType === "weight" ? bestWeight : null,
      latest_recorded_at: latestRecordedAt,
    });
  }

  const sorted = sortLeaderboardItems(
    Array.from(bestByUser.values()).map((item, index) => ({
      rank: index + 1,
      user_id: item.user_id,
      user_name: "회원",
      user_avatar_url: null,
      record_type: selectedRecordType,
      best_seconds: selectedRecordType === "time" ? item.best_seconds : null,
      best_weight_kg: selectedRecordType === "weight" ? item.best_weight_kg : null,
      record_reps: selectedPreset?.target_reps ?? null,
      distance_m: selectedPreset?.distance_m ?? null,
      preset_key: selectedPresetKey || null,
      latest_recorded_at: item.latest_recorded_at,
    })),
    selectedRecordType
  )
    .filter((item) => (selectedRecordType === "time" ? item.best_seconds != null : item.best_weight_kg != null))
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const profileIds = sorted.map((item) => item.user_id);
  const tenantProfileRows = await listTenantUserProfiles(supabase, tenant.id, profileIds);
  const tenantProfileById = new Map(tenantProfileRows.map((profile) => [profile.user_id, profile]));

  const genderFiltered =
    selectedGender === "all"
      ? sorted
      : sorted.filter((item) => tenantProfileById.get(item.user_id)?.gender === selectedGender);

  const total = genderFiltered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const normalizedPage = Math.min(Math.max(1, page), totalPages);
  const start = (normalizedPage - 1) * pageSize;
  const end = start + pageSize;
  const paged = genderFiltered.slice(start, end);

  const items = paged.map((item) => ({
    ...item,
    user_name: resolveTenantDisplayName(tenantProfileById.get(item.user_id), null, null),
    user_avatar_url: tenantProfileById.get(item.user_id)?.avatar_url ?? null,
  }));

  return {
    exerciseOptions,
    presetOptions,
    selectedExerciseKey,
    selectedPresetKey,
    selectedGender,
    items,
    total,
    page: normalizedPage,
    pageSize,
    totalPages,
  };
}

export async function getAdminUserWorkoutRecords(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  userId: string
): Promise<AdminUserWorkoutRecordRow[]> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return [];
  }

  const { data } = await supabase
    .from("user_workout_records_v2")
    .select("id, exercise_key, record_type, preset_key, distance, record_seconds, record_weight_kg, record_reps, recorded_at")
    .eq("tenant_id", tenant.id)
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<
      Array<{
        id: string;
        exercise_key: string;
        record_type: "time" | "weight";
        preset_key: string | null;
        distance: number | null;
        record_seconds: number | null;
        record_weight_kg: number | null;
        record_reps: number | null;
        recorded_at: string;
      }>
    >();

  return (data ?? []).map((row) => ({
    ...row,
    distance: row.distance == null ? null : Number(row.distance),
    record_seconds: row.record_seconds == null ? null : Number(row.record_seconds),
    record_weight_kg: row.record_weight_kg == null ? null : Number(row.record_weight_kg),
    record_reps: row.record_reps == null ? null : Number(row.record_reps),
  }));
}

async function getBookingServiceOptionsAndSlots(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  serviceIds: string[]
) {
  if (serviceIds.length === 0) {
    return {
      optionsByServiceId: new Map<string, AdminBookingServiceRow["options"]>(),
      slotsByServiceId: new Map<string, AdminBookingServiceRow["upcoming_slots"]>(),
    };
  }

  const [optionsRes, slotsRes] = await Promise.all([
    supabase
      .from("booking_service_options")
      .select("id, booking_service_id, name, description, price_krw, sort_order, is_enabled, created_at, updated_at")
      .in("booking_service_id", serviceIds)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<
        Array<{
          id: string;
          booking_service_id: string;
          name: string;
          description: string;
          price_krw: number;
          sort_order: number;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        }>
      >(),
    supabase
      .from("booking_slots")
      .select("id, tenant_id, booking_service_id, slot_date, starts_at, ends_at, duration_minutes, status, created_at, updated_at")
      .eq("tenant_id", tenantId)
      .in("booking_service_id", serviceIds)
      .gte("ends_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("starts_at", { ascending: true })
      .returns<
        Array<{
          id: string;
          tenant_id: string;
          booking_service_id: string;
          slot_date: string;
          starts_at: string;
          ends_at: string;
          duration_minutes: 60 | 90;
          status: AdminBookingServiceRow["upcoming_slots"][number]["status"];
          created_at: string;
          updated_at: string;
        }>
      >(),
  ]);

  const optionsByServiceId = new Map<string, AdminBookingServiceRow["options"]>();
  for (const option of optionsRes.data ?? []) {
    const rows = optionsByServiceId.get(option.booking_service_id) ?? [];
    rows.push({
      id: option.id,
      booking_service_id: option.booking_service_id,
      name: option.name,
      description: option.description,
      price_krw: Number(option.price_krw),
      sort_order: Number(option.sort_order),
      is_enabled: option.is_enabled,
      created_at: option.created_at,
      updated_at: option.updated_at,
    });
    optionsByServiceId.set(option.booking_service_id, rows);
  }

  const slotsByServiceId = new Map<string, AdminBookingServiceRow["upcoming_slots"]>();
  for (const slot of slotsRes.data ?? []) {
    const rows = slotsByServiceId.get(slot.booking_service_id) ?? [];
    rows.push({
      id: slot.id,
      tenant_id: slot.tenant_id,
      booking_service_id: slot.booking_service_id,
      slot_date: slot.slot_date,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      duration_minutes: slot.duration_minutes,
      status: slot.status,
      created_at: slot.created_at,
      updated_at: slot.updated_at,
    });
    slotsByServiceId.set(slot.booking_service_id, rows);
  }

  return { optionsByServiceId, slotsByServiceId };
}

export async function getAdminBookingServicesPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  params: { page: number; pageSize: number }
): Promise<AdminBookingServicesPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(params.page, params.pageSize);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const { count } = await supabase
    .from("booking_services")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data: services } = await supabase
    .from("booking_services")
    .select("id, tenant_id, name, description, is_active, pending_hold_minutes, created_by, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false })
    .range(from, to)
    .returns<
      Array<{
        id: string;
        tenant_id: string;
        name: string;
        description: string;
        is_active: boolean;
        pending_hold_minutes: number;
        created_by: string;
        created_at: string;
        updated_at: string;
      }>
    >();

  const serviceRows = services ?? [];
  const serviceIds = serviceRows.map((service) => service.id);

  const { optionsByServiceId, slotsByServiceId } = await getBookingServiceOptionsAndSlots(supabase, tenant.id, serviceIds);

  return {
    items: serviceRows.map((service) => {
      const upcomingSlots = slotsByServiceId.get(service.id) ?? [];
      return {
        id: service.id,
        tenant_id: service.tenant_id,
        name: service.name,
        description: service.description,
        is_active: service.is_active,
        created_at: service.created_at,
        updated_at: service.updated_at,
        option_count: (optionsByServiceId.get(service.id) ?? []).length,
        active_slot_count: upcomingSlots.filter((slot) => slot.status === "open" || slot.status === "pending" || slot.status === "booked").length,
      } satisfies AdminBookingServiceListRow;
    }),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminLocationsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  params: { page: number; pageSize: number }
): Promise<AdminLocationsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(params.page, params.pageSize);
  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data } = await supabase
    .from("locations")
    .select("id, tenant_id, name, address, thumbnail_url, image_urls, is_new, is_published, sort_order, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false })
    .range(from, to)
    .returns<
      Array<{
        id: string;
        tenant_id: string;
        name: string;
        address: string;
        thumbnail_url: string | null;
        image_urls: unknown;
        is_new: boolean;
        is_published: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }>
    >();

  return {
    items: (data ?? []).map((location) => {
      return {
        id: location.id,
        tenant_id: location.tenant_id,
        name: location.name,
        address: location.address,
        thumbnail_url: location.thumbnail_url ?? "",
        image_count: normalizeStringArray(location.image_urls, 5).length,
        is_new: location.is_new,
        is_published: location.is_published,
        sort_order: location.sort_order,
        created_at: location.created_at,
        updated_at: location.updated_at,
      } satisfies AdminLocationListRow;
    }),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getAdminLocationById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  id: string
): Promise<AdminLocationRow | null> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data } = await supabase
    .from("locations")
    .select("id, tenant_id, name, address, description, thumbnail_url, image_urls, map_image_url, amenities, sort_order, is_new, is_published, created_by, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      name: string;
      address: string;
      description: string | null;
      thumbnail_url: string | null;
      image_urls: unknown;
      map_image_url: string | null;
      amenities: unknown;
      sort_order: number;
      is_new: boolean;
      is_published: boolean;
      created_by: string;
      created_at: string;
      updated_at: string;
    }>();

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    name: data.name,
    address: data.address,
    description: data.description ?? "",
    thumbnail_url: data.thumbnail_url ?? "",
    image_urls: normalizeStringArray(data.image_urls, 5),
    map_image_url: data.map_image_url ?? "",
    amenities: normalizeLocationAmenities(data.amenities),
    sort_order: data.sort_order,
    is_new: data.is_new,
    is_published: data.is_published,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getAdminBookingServiceById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  id: string
): Promise<AdminBookingServiceRow | null> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return null;
  }

  const { data: service } = await supabase
    .from("booking_services")
    .select("id, tenant_id, name, description, is_active, pending_hold_minutes, created_by, created_at, updated_at")
    .eq("tenant_id", tenant.id)
    .eq("id", id)
    .maybeSingle<{
      id: string;
      tenant_id: string;
      name: string;
      description: string;
      is_active: boolean;
      pending_hold_minutes: number;
      created_by: string;
      created_at: string;
      updated_at: string;
    }>();

  if (!service) {
    return null;
  }

  const { optionsByServiceId, slotsByServiceId } = await getBookingServiceOptionsAndSlots(supabase, tenant.id, [service.id]);
  const upcomingSlots = (slotsByServiceId.get(service.id) ?? []).slice(0, 24);

  return {
    id: service.id,
    tenant_id: service.tenant_id,
    name: service.name,
    description: service.description,
    is_active: service.is_active,
    pending_hold_minutes: Number(service.pending_hold_minutes),
    created_by: service.created_by,
    created_at: service.created_at,
    updated_at: service.updated_at,
    options: optionsByServiceId.get(service.id) ?? [],
    upcoming_slots: upcomingSlots,
  };
}

export async function getAdminBookingReservationsPage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantSlug: string,
  params: { page: number; pageSize: number }
): Promise<AdminBookingReservationsPage> {
  const tenant = await getTenantBySlug(supabase, tenantSlug);
  const { normalizedPage, normalizedPageSize } = normalizeStandardPagedParams(params.page, params.pageSize);

  if (!tenant) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: normalizedPageSize,
      totalPages: 1,
    };
  }

  const { count } = await supabase
    .from("booking_reservations")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(1, normalizedPage), totalPages);
  const from = (currentPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  const { data } = await supabase
    .from("booking_reservations")
    .select(
      "id, tenant_id, booking_service_id, slot_id, user_id, booking_option_id, price_krw, status, booker_name, booker_phone, user_memo, admin_memo, pending_expires_at, confirmed_at, confirmed_by, canceled_at, canceled_by, created_at, updated_at, service:booking_service_id(name), option:booking_option_id(name), slot:slot_id(starts_at, ends_at)"
    )
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<
      Array<{
        id: string;
        tenant_id: string;
        booking_service_id: string;
        slot_id: string;
        user_id: string | null;
        booking_option_id: string;
        price_krw: number;
        status: AdminBookingReservationsPage["items"][number]["status"];
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
        service: { name: string } | { name: string }[] | null;
        option: { name: string } | { name: string }[] | null;
        slot: { starts_at: string; ends_at: string } | { starts_at: string; ends_at: string }[] | null;
      }>
    >();

  return {
    items: (data ?? [])
      .map((row) => {
      const service = Array.isArray(row.service) ? row.service[0] : row.service;
      const option = Array.isArray(row.option) ? row.option[0] : row.option;
      const slot = Array.isArray(row.slot) ? row.slot[0] : row.slot;

      return {
        id: row.id,
        tenant_id: row.tenant_id,
        booking_service_id: row.booking_service_id,
        slot_id: row.slot_id,
        user_id: row.user_id,
        booking_option_id: row.booking_option_id,
        price_krw: Number(row.price_krw),
        status: row.status,
        booker_name: row.booker_name,
        booker_phone: row.booker_phone,
        user_memo: row.user_memo,
        admin_memo: row.admin_memo,
        pending_expires_at: row.pending_expires_at,
        confirmed_at: row.confirmed_at,
        confirmed_by: row.confirmed_by,
        canceled_at: row.canceled_at,
        canceled_by: row.canceled_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        service_name: service?.name ?? "-",
        option_name: option?.name ?? "-",
        slot_starts_at: slot?.starts_at ?? row.created_at,
        slot_ends_at: slot?.ends_at ?? row.created_at,
      };
      })
      .sort((left, right) => {
        const slotCompared = Date.parse(left.slot_starts_at) - Date.parse(right.slot_starts_at);
        if (slotCompared !== 0) {
          return slotCompared;
        }

        return Date.parse(left.created_at) - Date.parse(right.created_at);
      }),
    total,
    page: currentPage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}
