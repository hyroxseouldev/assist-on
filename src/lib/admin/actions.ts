"use server";

import { revalidatePath } from "next/cache";

import type {
  AdminTenantUserCandidate,
  AdminCommunityCommentRow,
  BookingReservationStatus,
  BookingSlotStatus,
  GuestOrderStatus,
  AdminUserWorkoutRecordRow,
  CommunityPostStatus,
  CommunityReportStatus,
  ProgramApplicationStatus,
  ProgramDeliveryMode,
  ProgramDifficulty,
  ProgramMobileVisibility,
  SessionType,
} from "@/lib/admin/types";
import { getTenantLoginPath, getTenantResetPasswordPath, getTenantUpdatePasswordPath } from "@/lib/auth/paths";
import { getAdminUserWorkoutRecords } from "@/lib/admin/server";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import {
  DURATION_PASS_MONTHS,
  getDurationPassEndAt,
  getDurationPassStartAt,
  isDurationPassMonths,
  type DurationPassMonths,
} from "@/lib/store/duration-options";
import { getCohortEntitlementRange, getFixedDateEntitlementRange } from "@/lib/program/cohorts";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageTenantContent,
  canManageTenantMembers,
  getTenantUserProfile,
  getTenantBySlug,
  resolveTenantDisplayName,
  getUserTenantRole,
  isPlatformAdmin,
} from "@/lib/tenant/server";

export type ActionResult = {
  ok: boolean;
  message: string;
  programId?: string;
};

type SessionPayload = {
  programId: string;
  sessionDate: string;
  title: string;
  contentHtml: string;
  isPublished: boolean;
  publishAt: string | null;
  sessionType: SessionType;
};

type NoticePayload = {
  title: string;
  contentHtml: string;
  thumbnailUrl: string;
  isPublished: boolean;
};

type OfflineClassPayload = {
  title: string;
  contentHtml: string;
  thumbnailUrl: string;
  locationText: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  isPublished: boolean;
  mobileVisibility: "public" | "private";
  coachProfileId: string | null;
};

type GrantByEmailPayload = {
  email: string;
  role: "coach" | "member";
  programId: string;
  cohortId: string | null;
};

type ProgramEntitlementGrantProgram = {
  id: string;
  delivery_mode: ProgramDeliveryMode;
  content_starts_on: string | null;
  content_ends_on: string | null;
  end_date: string | null;
};

type ProgramEntitlementGrantCohort = {
  id: string;
  starts_on: string;
};

type TenantUserCandidateLookupRow = {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  already_member: boolean;
};

export type SearchTenantUserCandidateActionResult = {
  ok: boolean;
  message: string;
  user: AdminTenantUserCandidate | null;
};

async function ensureAdmin(tenantSlug: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    throw new Error("유효한 테넌트를 찾을 수 없습니다.");
  }

  const [platformAdmin, tenantRole] = await Promise.all([
    isPlatformAdmin(supabase, user.id),
    getUserTenantRole(supabase, user.id, tenant.id),
  ]);

  if (!platformAdmin && !canManageTenantContent(tenantRole)) {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return {
    supabase,
    tenant,
    user,
    isPlatformAdmin: platformAdmin,
    tenantRole,
    canManageMembers: platformAdmin || canManageTenantMembers(tenantRole),
  };
}

function ok(message: string): ActionResult {
  return { ok: true, message };
}

function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof Error) {
    return { ok: false, message: error.message || fallback };
  }
  return { ok: false, message: fallback };
}

function toDisplayName(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Member";
}

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return value.includes("@");
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function parseJsonStringArray(raw: FormDataEntryValue | null, maxItems: number) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const values = [...new Set(parsed.map((item) => (typeof item === "string" ? item.trim() : "")).filter((item) => item.length > 0))];
  if (values.length > maxItems) {
    return null;
  }

  return values;
}

async function requireTenantSlug(formData: FormData) {
  const explicitTenantSlug = String(formData.get("tenantSlug") ?? "").trim();
  if (explicitTenantSlug) {
    return explicitTenantSlug;
  }

  throw new Error("테넌트 정보가 없습니다.");
}

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseCoachProfileIds(values: FormDataEntryValue[]) {
  return [...new Set(values.map((value) => String(value).trim()).filter((value) => value.length > 0))];
}

function isEditableCoachStatus(value: string) {
  return value === "active" || value === "inactive";
}

function isGuestOrderStatus(value: string): value is GuestOrderStatus {
  return value === "pending" || value === "confirmed" || value === "canceled";
}

function parseProgramDifficulty(raw: FormDataEntryValue | null): ProgramDifficulty {
  const value = String(raw ?? "intermediate").trim() as ProgramDifficulty;
  if (value === "beginner" || value === "intermediate" || value === "advanced") {
    return value;
  }
  return "intermediate";
}

function parseProgramMobileVisibility(raw: FormDataEntryValue | null): ProgramMobileVisibility {
  const value = String(raw ?? "public").trim() as ProgramMobileVisibility;
  if (value === "public" || value === "members_only" || value === "private") {
    return value;
  }
  return "public";
}

function parseProgramDeliveryMode(raw: FormDataEntryValue | null): ProgramDeliveryMode {
  const value = String(raw ?? "fixed_date").trim();
  return value === "cohort_based" ? "cohort_based" : "fixed_date";
}

function parseIntegerField(raw: FormDataEntryValue | null, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.floor(value);
}

function parseDurationOptions(raw: FormDataEntryValue | null, fallbackPrice: number) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) {
    return null;
  }

  const mapped = parsed
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const durationMonths = Number((item as { duration_months?: unknown }).duration_months);
      const priceKrw = Number((item as { price_krw?: unknown }).price_krw);
      const isEnabled = Boolean((item as { is_enabled?: unknown }).is_enabled);

      if (!isDurationPassMonths(durationMonths)) {
        return null;
      }

      return {
        duration_months: durationMonths,
        price_krw: Number.isFinite(priceKrw) ? Math.floor(priceKrw) : fallbackPrice,
        is_enabled: isEnabled,
      };
    })
    .filter((item): item is { duration_months: DurationPassMonths; price_krw: number; is_enabled: boolean } => item !== null);

  return DURATION_PASS_MONTHS.map((durationMonths) => mapped.find((item) => item.duration_months === durationMonths)).map(
    (item, index) =>
      item ?? {
        duration_months: DURATION_PASS_MONTHS[index],
        price_krw: fallbackPrice,
        is_enabled: false,
      }
  );
}

function parseSessionType(raw: FormDataEntryValue | null): SessionType {
  const value = String(raw ?? "training").trim() as SessionType;
  if (value === "training" || value === "rest") {
    return value;
  }
  return "training";
}

function parseSessionPayload(formData: FormData): SessionPayload {
  const contentHtml = String(formData.get("contentHtml") ?? "").trim();
  const isPublished = String(formData.get("isPublished") ?? "") === "true";
  const publishAtRaw = formData.get("publishAt");
  const publishAtText = String(publishAtRaw ?? "").trim();

  return {
    programId: String(formData.get("programId") ?? "").trim(),
    sessionDate: String(formData.get("sessionDate") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    contentHtml,
    isPublished,
    publishAt: isPublished && publishAtText ? parseDateTimeInKst(publishAtRaw) : null,
    sessionType: parseSessionType(formData.get("sessionType")),
  };
}

function parseNoticePayload(formData: FormData): NoticePayload {
  const title = String(formData.get("title") ?? "").trim();
  const contentHtml = String(formData.get("contentHtml") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const isPublished = String(formData.get("isPublished") ?? "") === "true";

  return {
    title,
    contentHtml,
    thumbnailUrl,
    isPublished,
  };
}

function parseDateTimeInKst(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) {
    throw new Error("날짜/시간을 입력해 주세요.");
  }

  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  const normalized = `${withSeconds}+09:00`;
  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    throw new Error("유효한 날짜/시간 형식이 아닙니다.");
  }

  return new Date(timestamp).toISOString();
}

function parseOfflineClassPayload(formData: FormData): OfflineClassPayload {
  const title = String(formData.get("title") ?? "").trim();
  const contentHtml = String(formData.get("contentHtml") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
  const locationText = String(formData.get("locationText") ?? "").trim();
  const startsAt = parseDateTimeInKst(formData.get("startsAt"));
  const endsAt = parseDateTimeInKst(formData.get("endsAt"));
  const capacity = Number(formData.get("capacity"));
  const isPublished = String(formData.get("isPublished") ?? "") === "true";
  const mobileVisibility = String(formData.get("mobileVisibility") ?? "public").trim();
  const coachProfileId = String(formData.get("coachProfileId") ?? "").trim() || null;

  return {
    title,
    contentHtml,
    thumbnailUrl,
    locationText,
    startsAt,
    endsAt,
    capacity,
    isPublished,
    mobileVisibility: mobileVisibility === "private" ? "private" : "public",
    coachProfileId,
  };
}

function validateSessionPayload(payload: SessionPayload) {
  if (!payload.programId || !payload.sessionDate || !payload.title) {
    throw new Error("세션 필수 항목을 모두 입력해 주세요.");
  }

  if (payload.sessionType === "training" && !payload.contentHtml) {
    throw new Error("세션 본문을 입력해 주세요.");
  }
}

function validateNoticePayload(payload: NoticePayload) {
  if (!payload.title) {
    throw new Error("공지 제목을 입력해 주세요.");
  }

  if (!payload.contentHtml) {
    throw new Error("공지 본문을 입력해 주세요.");
  }
}

function validateOfflineClassPayload(payload: OfflineClassPayload) {
  if (!payload.title) {
    throw new Error("클래스 제목을 입력해 주세요.");
  }

  if (!payload.locationText) {
    throw new Error("장소를 입력해 주세요.");
  }

  if (!payload.contentHtml) {
    throw new Error("클래스 설명을 입력해 주세요.");
  }

  if (!Number.isFinite(payload.capacity) || payload.capacity <= 0) {
    throw new Error("정원은 1명 이상의 숫자여야 합니다.");
  }

  if (Date.parse(payload.endsAt) <= Date.parse(payload.startsAt)) {
    throw new Error("종료 시간은 시작 시간보다 늦어야 합니다.");
  }
}

async function validateOfflineClassCoachProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  coachProfileId: string | null
) {
  if (!coachProfileId) {
    return null;
  }

  const { data, error } = await supabase
    .from("coach_profiles")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", coachProfileId)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("유효한 담당 코치를 선택해 주세요.");
  }

  return data.id;
}

function parseGrantByEmailPayload(formData: FormData): GrantByEmailPayload {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: String(formData.get("role") ?? "member").trim() as GrantByEmailPayload["role"],
    programId: String(formData.get("programId") ?? "").trim(),
    cohortId: String(formData.get("cohortId") ?? "").trim() || null,
  };
}

function validateGrantByEmailPayload(payload: GrantByEmailPayload) {
  if (!payload.email || !payload.email.includes("@")) {
    throw new Error("유효한 이메일 주소를 입력해 주세요.");
  }

  if (!payload.programId) {
    throw new Error("권한을 부여할 프로그램을 선택해 주세요.");
  }

  if (![
    "coach",
    "member",
  ].includes(payload.role)) {
    throw new Error("유효한 권한을 선택해 주세요.");
  }
}

async function getProgramGrantCohort(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  tenantId: string,
  program: ProgramEntitlementGrantProgram,
  requestedCohortId?: string | null
) {
  if (program.delivery_mode !== "cohort_based") {
    return null;
  }

  let query = supabase
    .from("program_cohorts")
    .select("id, starts_on")
    .eq("tenant_id", tenantId)
    .eq("program_id", program.id);

  query = requestedCohortId ? query.eq("id", requestedCohortId) : query.eq("is_default", true);

  const { data, error } = await query
    .order("starts_on", { ascending: true })
    .limit(1)
    .maybeSingle<ProgramEntitlementGrantCohort>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(requestedCohortId ? "선택한 기수를 찾지 못했습니다." : "기수제 프로그램의 기본 기수를 먼저 설정해 주세요.");
  }

  return data;
}

async function buildProgramEntitlementPayload(params: {
  supabase: ReturnType<typeof createSupabaseAdminClient>;
  tenantId: string;
  program: ProgramEntitlementGrantProgram;
  nowIso: string;
  requestedCohortId?: string | null;
  fallbackEndsAt?: string | null;
}) {
  if (params.program.delivery_mode !== "cohort_based") {
    const fixedRange = getFixedDateEntitlementRange(params.program, params.nowIso);
    return {
      cohort_id: null,
      starts_at: fixedRange.startsAt,
      ends_at: params.fallbackEndsAt ?? fixedRange.endsAt,
    };
  }

  const cohort = await getProgramGrantCohort(params.supabase, params.tenantId, params.program, params.requestedCohortId);
  if (!cohort) {
    throw new Error("기수제 프로그램의 기본 기수를 먼저 설정해 주세요.");
  }

  const range = getCohortEntitlementRange(params.program, cohort);

  if (!range) {
    throw new Error("기수제 프로그램 접근 기간 계산에 실패했습니다.");
  }

  return {
    cohort_id: cohort.id,
    starts_at: range.startsAt,
    ends_at: range.endsAt,
  };
}

function rolePriority(role: "owner" | "coach" | "member") {
  if (role === "owner") return 3;
  if (role === "coach") return 2;
  return 1;
}

function refreshTrainingPages(tenantSlug: string) {
  revalidatePath("/");
  revalidatePath(`/t/${tenantSlug}`);
  revalidatePath(`/t/${tenantSlug}/community`);
  revalidatePath(`/t/${tenantSlug}/notices`);
  revalidatePath(`/t/${tenantSlug}/legal`);
  revalidatePath(`/t/${tenantSlug}/legal/privacy`);
  revalidatePath(`/t/${tenantSlug}/legal/terms`);
  revalidatePath(`/t/${tenantSlug}/offline-classes`);
  revalidatePath(`/t/${tenantSlug}/admin`);
  revalidatePath(`/t/${tenantSlug}/admin/branding`);
  revalidatePath(`/t/${tenantSlug}/admin/program`);
  revalidatePath(`/t/${tenantSlug}/admin/program-applications`);
  revalidatePath(`/t/${tenantSlug}/admin/program/new`);
  revalidatePath(`/t/${tenantSlug}/admin/store/products`);
  revalidatePath(`/t/${tenantSlug}/admin/store/orders`);
  revalidatePath(`/t/${tenantSlug}/admin/booking-services`);
  revalidatePath(`/t/${tenantSlug}/admin/booking-services/orders`);
  revalidatePath(`/t/${tenantSlug}/admin/sessions`);
  revalidatePath(`/t/${tenantSlug}/admin/notices`);
  revalidatePath(`/t/${tenantSlug}/admin/legal-documents`);
  revalidatePath(`/t/${tenantSlug}/admin/offline-classes`);
  revalidatePath(`/t/${tenantSlug}/admin/community`);
  revalidatePath(`/t/${tenantSlug}/admin/report`);
  revalidatePath(`/t/${tenantSlug}/admin/users`);
  revalidatePath("/tenant/login");
  revalidatePath(getTenantLoginPath(tenantSlug));
  revalidatePath("/mypage/active-programs");
  revalidatePath("/mypage/subscriptions");
  revalidatePath("/reset-password");
  revalidatePath("/update-password");
  revalidatePath(getTenantResetPasswordPath(tenantSlug));
  revalidatePath(getTenantUpdatePasswordPath(tenantSlug));
}

function refreshUserAdminPages(tenantSlug: string) {
  revalidatePath(`/t/${tenantSlug}/admin/users`);
}

function isProgramApplicationStatus(value: string): value is ProgramApplicationStatus {
  return value === "pending" || value === "approved" || value === "rejected" || value === "canceled";
}

async function upsertTenantUserProfileForMember(
  supabase: ReturnType<typeof createSupabaseAdminClient> | Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  user: { id: string; email?: string | null; user_metadata?: { full_name?: string; avatar_url?: string } }
) {
  const { data: existingProfile } = await supabase
    .from("tenant_user_profiles")
    .select("display_name, avatar_url, gender, tenant_status, deactivated_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle<{
      display_name: string | null;
      avatar_url: string | null;
      gender: string | null;
      tenant_status: "active" | "deactivated" | null;
      deactivated_at: string | null;
    }>();

  const { data: globalProfile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, gender, account_status, deactivated_at")
    .eq("id", user.id)
    .maybeSingle<{
      full_name: string | null;
      avatar_url: string | null;
      gender: string | null;
      account_status: "active" | "deactivated" | null;
      deactivated_at: string | null;
    }>();

  const { error } = await supabase.from("tenant_user_profiles").upsert(
    {
      tenant_id: tenantId,
      user_id: user.id,
      display_name:
        existingProfile?.display_name ?? resolveTenantDisplayName(null, { full_name: globalProfile?.full_name ?? null }, user),
      avatar_url: existingProfile ? existingProfile.avatar_url : null,
      gender: existingProfile?.gender ?? globalProfile?.gender ?? null,
      tenant_status: existingProfile?.tenant_status ?? (globalProfile?.account_status === "deactivated" ? "deactivated" : "active"),
      deactivated_at:
        existingProfile?.tenant_status === "deactivated"
          ? existingProfile.deactivated_at
          : globalProfile?.account_status === "deactivated"
          ? globalProfile.deactivated_at ?? new Date().toISOString()
          : null,
    },
    { onConflict: "tenant_id,user_id" }
  );

  return error;
}

async function findTenantUserCandidateByEmail(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  email: string
) {
  const { data, error } = await supabase
    .rpc("find_tenant_user_candidate_by_email", {
      p_tenant_id: tenantId,
      p_email: email,
    })
    .returns<TenantUserCandidateLookupRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = Array.isArray(data) ? data : [];
  const candidate = rows[0];
  if (!candidate) {
    return null;
  }

  return {
    user_id: candidate.user_id,
    email: candidate.email,
    full_name: candidate.full_name,
    avatar_url: candidate.avatar_url,
    already_member: candidate.already_member,
  } satisfies AdminTenantUserCandidate;
}

function parseAdminDateTimeInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("종료일을 입력해 주세요.");
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("유효한 종료일을 입력해 주세요.");
  }

  return parsed.toISOString();
}

export async function updateProgramLogoAction(tenantSlug: string, programId: string, logoUrl: string): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(tenantSlug);
    const trimmedProgramId = programId.trim();
    const trimmedLogoUrl = logoUrl.trim();

    if (!trimmedProgramId) {
      return { ok: false, message: "프로그램 ID가 없습니다." };
    }

    if (!trimmedLogoUrl) {
      return { ok: false, message: "로고 URL이 비어 있습니다." };
    }

    const { error } = await supabase
      .from("programs")
      .update({ thumbnail_url: trimmedLogoUrl })
      .eq("tenant_id", tenant.id)
      .eq("id", trimmedProgramId);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("프로그램 로고가 저장되었습니다.");
  } catch (error) {
    return fail(error, "프로그램 로고 저장에 실패했습니다.");
  }
}

export async function updateProgramInfoAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "프로그램 ID가 없습니다." };
    }

    const patch = {
      team_name: String(formData.get("teamName") ?? "").trim(),
      slogan: String(formData.get("slogan") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      coach_name: String(formData.get("coachName") ?? "").trim(),
      coach_instagram: String(formData.get("coachInstagram") ?? "").trim(),
      coach_career: parseLines(formData.get("coachCareer")),
      start_date: String(formData.get("startDate") ?? "").trim(),
      end_date: String(formData.get("endDate") ?? "").trim(),
    };

    const { error } = await supabase.from("programs").update(patch).eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("프로그램 정보가 저장되었습니다.");
  } catch (error) {
    return fail(error, "프로그램 정보 저장에 실패했습니다.");
  }
}

export async function updateTenantBrandingAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));

    const patch = {
      logo_url: String(formData.get("logoUrl") ?? "").trim(),
      bank_name: String(formData.get("bankName") ?? "").trim(),
      bank_account_number: String(formData.get("bankAccountNumber") ?? "").trim(),
      bank_account_holder: String(formData.get("bankAccountHolder") ?? "").trim(),
      bank_deposit_guide: String(formData.get("bankDepositGuide") ?? "").trim(),
    };

    if ((patch.bank_name || patch.bank_account_number || patch.bank_account_holder) && !patch.bank_name) {
      return { ok: false, message: "은행명을 입력해 주세요." };
    }

    if ((patch.bank_name || patch.bank_account_number || patch.bank_account_holder) && !patch.bank_account_number) {
      return { ok: false, message: "계좌번호를 입력해 주세요." };
    }

    if ((patch.bank_name || patch.bank_account_number || patch.bank_account_holder) && !patch.bank_account_holder) {
      return { ok: false, message: "예금주명을 입력해 주세요." };
    }

    const { error } = await supabase.from("tenant_branding").update(patch).eq("tenant_id", tenant.id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("브랜딩 정보가 저장되었습니다.");
  } catch (error) {
    return fail(error, "브랜딩 정보 저장에 실패했습니다.");
  }
}

export async function createCoachProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));

    if (!canManageMembers) {
      return { ok: false, message: "코치 프로필 생성 권한이 없습니다." };
    }

    const userId = String(formData.get("userId") ?? "").trim();
    const displayName = String(formData.get("displayName") ?? "").trim();
    const instagram = String(formData.get("instagram") ?? "").trim();
    const introduction = String(formData.get("introduction") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();
    const additionalImageUrls = parseJsonStringArray(formData.get("additionalImageUrls"), 6);
    const status = String(formData.get("status") ?? "active").trim();

    if (!userId) {
      return { ok: false, message: "코치 계정을 선택해 주세요." };
    }

    if (!additionalImageUrls) {
      return { ok: false, message: "추가 이미지는 최대 6장까지 등록할 수 있습니다." };
    }

    const [membershipResult, tenantProfile] = await Promise.all([
      supabase
        .from("tenant_memberships")
        .select("role")
        .eq("tenant_id", tenant.id)
        .eq("user_id", userId)
        .maybeSingle<{ role: "owner" | "coach" | "member" }>(),
      getTenantUserProfile(supabase, tenant.id, userId),
    ]);
    const membership = membershipResult.data;

    if (!membership || (membership.role !== "owner" && membership.role !== "coach")) {
      return { ok: false, message: "owner 또는 coach 권한이 있는 내부 멤버만 코치 프로필로 등록할 수 있습니다." };
    }

    const resolvedDisplayName = displayName || tenantProfile?.display_name?.trim() || "코치";

    const { error } = await supabase.from("coach_profiles").insert({
      tenant_id: tenant.id,
      user_id: userId,
      display_name: resolvedDisplayName,
      instagram,
      introduction,
      career: parseLines(formData.get("career")),
      image_url: imageUrl,
      additional_image_urls: additionalImageUrls,
      is_active: isEditableCoachStatus(status) ? status === "active" : true,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(`/t/${tenant.slug}/admin/coaches`);
    return ok("코치 프로필이 생성되었습니다.");
  } catch (error) {
    return fail(error, "코치 프로필 생성에 실패했습니다.");
  }
}

export async function updateCoachProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "코치 프로필 ID가 없습니다." };
    }

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("coach_profiles")
      .select("id, tenant_id, user_id")
      .eq("tenant_id", tenant.id)
      .eq("id", id)
      .maybeSingle<{ id: string; tenant_id: string; user_id: string }>();

    if (existingProfileError) {
      return { ok: false, message: existingProfileError.message };
    }

    if (!existingProfile) {
      return { ok: false, message: "코치 프로필을 찾을 수 없습니다." };
    }

    const canEditOwnProfile = existingProfile.user_id === user.id;
    if (!canManageMembers && !canEditOwnProfile) {
      return { ok: false, message: "자신의 코치 프로필만 수정할 수 있습니다." };
    }

    const displayName = String(formData.get("displayName") ?? "").trim();
    if (!displayName) {
      return { ok: false, message: "표시 이름을 입력해 주세요." };
    }

    const patch: {
      display_name: string;
      instagram: string;
      introduction: string;
      career: string[];
      image_url: string;
      additional_image_urls: string[];
      is_active?: boolean;
    } = {
      display_name: displayName,
      instagram: String(formData.get("instagram") ?? "").trim(),
      introduction: String(formData.get("introduction") ?? "").trim(),
      career: parseLines(formData.get("career")),
      image_url: String(formData.get("imageUrl") ?? "").trim(),
      additional_image_urls: [],
    };

    const additionalImageUrls = parseJsonStringArray(formData.get("additionalImageUrls"), 6);
    if (!additionalImageUrls) {
      return { ok: false, message: "추가 이미지는 최대 6장까지 등록할 수 있습니다." };
    }
    patch.additional_image_urls = additionalImageUrls;

    const status = String(formData.get("status") ?? "").trim();
    if (canManageMembers && isEditableCoachStatus(status)) {
      patch.is_active = status === "active";
    }

    const { error } = await supabase.from("coach_profiles").update(patch).eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(`/t/${tenant.slug}/admin/coaches`);
    return ok("코치 프로필이 저장되었습니다.");
  } catch (error) {
    return fail(error, "코치 프로필 저장에 실패했습니다.");
  }
}

export async function deleteCoachProfileAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));

    if (!canManageMembers) {
      return { ok: false, message: "코치 프로필 삭제 권한이 없습니다." };
    }

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "코치 프로필 ID가 없습니다." };
    }

    const { error } = await supabase.from("coach_profiles").delete().eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(`/t/${tenant.slug}/admin/coaches`);
    return ok("코치 프로필이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "코치 프로필 삭제에 실패했습니다.");
  }
}

export async function approveBankTransferOrderAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant, user } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const orderId = String(formData.get("orderId") ?? "").trim();

    if (!orderId) {
      return { ok: false, message: "주문 ID가 없습니다." };
    }

    const { data: order } = await adminSupabase
      .from("program_orders")
      .select("id, tenant_id, buyer_user_id, product_id, amount_krw, status, payment_method, duration_months")
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .maybeSingle<{
        id: string;
        tenant_id: string;
        buyer_user_id: string;
        product_id: string;
        amount_krw: number;
        status: string;
        payment_method: string | null;
        duration_months: 1 | 2 | 3 | 6 | null;
      }>();

    if (!order) {
      return { ok: false, message: "주문 정보를 찾을 수 없습니다." };
    }

    if (order.payment_method !== "bank_transfer") {
      return { ok: false, message: "무통장 주문만 입금 확인 처리할 수 있습니다." };
    }

    if (order.status === "paid") {
      return { ok: true, message: "이미 입금 확인 처리된 주문입니다." };
    }

    if (order.status !== "pending") {
      return { ok: false, message: "대기 상태 주문만 입금 확인 처리할 수 있습니다." };
    }

    const { data: product } = await adminSupabase
      .from("program_products")
      .select("id, program_id, sale_type, program:program_id(id, delivery_mode, content_starts_on, content_ends_on, end_date)")
      .eq("tenant_id", tenant.id)
      .eq("id", order.product_id)
      .maybeSingle<{
        id: string;
        program_id: string;
        sale_type: "one_time" | "subscription" | null;
        program: ProgramEntitlementGrantProgram | null;
      }>();

    if (!product) {
      return { ok: false, message: "상품 정보를 찾을 수 없습니다." };
    }

    if (product.sale_type === "subscription") {
      return { ok: false, message: "구독 상품은 무통장 수동 승인 대상이 아닙니다." };
    }

    if (!product.program) {
      return { ok: false, message: "프로그램 정보를 찾을 수 없습니다." };
    }

    const approvedAt = new Date().toISOString();
    const durationMonths = order.duration_months;
    const { error: orderUpdateError } = await adminSupabase
      .from("program_orders")
      .update({
        status: "paid",
        paid_at: approvedAt,
        fail_reason: null,
        raw_confirm: {
          type: "manual_bank_transfer_approval",
          approved_by: user.id,
          approved_at: approvedAt,
        },
      })
      .eq("id", order.id);

    if (orderUpdateError) {
      return { ok: false, message: orderUpdateError.message };
    }

    if (!durationMonths || !isDurationPassMonths(durationMonths)) {
      return { ok: false, message: "기간권 정보가 없는 주문입니다." };
    }

    const nowIso = new Date().toISOString();
    const fallbackEndsAt = getDurationPassEndAt(approvedAt, durationMonths);
    const entitlementPayload = await buildProgramEntitlementPayload({
      supabase: adminSupabase,
      tenantId: tenant.id,
      program: product.program,
      nowIso: approvedAt,
      fallbackEndsAt,
    });

    const { data: existingEntitlementByOrder } = await adminSupabase
      .from("program_entitlements")
      .select("id")
      .eq("source_order_id", order.id)
      .maybeSingle<{ id: string }>();

    if (!existingEntitlementByOrder) {
      const { data: existingActiveEntitlement } = await adminSupabase
        .from("program_entitlements")
        .select("id, ends_at")
        .eq("tenant_id", tenant.id)
        .eq("user_id", order.buyer_user_id)
        .eq("program_id", product.program_id)
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ id: string; ends_at: string | null }>();

      if (existingActiveEntitlement) {
        const nextEndsAt =
          product.program.delivery_mode === "cohort_based"
            ? entitlementPayload.ends_at
            : getDurationPassEndAt(getDurationPassStartAt(approvedAt, existingActiveEntitlement.ends_at), durationMonths);

        const { error: entitlementUpdateError } = await adminSupabase
          .from("program_entitlements")
          .update({
            cohort_id: entitlementPayload.cohort_id,
            starts_at: entitlementPayload.starts_at,
            ends_at: nextEndsAt,
            is_active: true,
          })
          .eq("id", existingActiveEntitlement.id);

        if (entitlementUpdateError) {
          return { ok: false, message: entitlementUpdateError.message };
        }
      } else {
        const { error: entitlementInsertError } = await adminSupabase.from("program_entitlements").insert({
          tenant_id: tenant.id,
          user_id: order.buyer_user_id,
          program_id: product.program_id,
          source_order_id: order.id,
          cohort_id: entitlementPayload.cohort_id,
          starts_at: entitlementPayload.starts_at,
          ends_at: entitlementPayload.ends_at,
          is_active: true,
        });

        if (entitlementInsertError) {
          return { ok: false, message: entitlementInsertError.message };
        }
      }
    }

    await adminSupabase.from("tenant_memberships").upsert(
      {
        tenant_id: tenant.id,
        user_id: order.buyer_user_id,
        role: "member",
      },
      {
        onConflict: "tenant_id,user_id",
        ignoreDuplicates: true,
      }
    );

    const { data: orderUser } = await adminSupabase.auth.admin.getUserById(order.buyer_user_id);
    if (orderUser.user) {
      const profileUpsertError = await upsertTenantUserProfileForMember(adminSupabase, tenant.id, orderUser.user);
      if (profileUpsertError) {
        return { ok: false, message: profileUpsertError.message };
      }
    }

    await adminSupabase.from("user_program_states").upsert(
      {
        tenant_id: tenant.id,
        user_id: order.buyer_user_id,
        active_program_id: product.program_id,
      },
      { onConflict: "tenant_id,user_id" }
    );

    refreshTrainingPages(tenant.slug);
    return ok("입금 확인 처리와 프로그램 권한 활성화가 완료되었습니다.");
  } catch (error) {
    return fail(error, "입금 확인 처리에 실패했습니다.");
  }
}

export async function updateProgramApplicationStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const applicationId = String(formData.get("applicationId") ?? "").trim();
    const nextStatus = String(formData.get("status") ?? "").trim();

    if (!applicationId) {
      return { ok: false, message: "신청 ID가 없습니다." };
    }

    if (!isProgramApplicationStatus(nextStatus)) {
      return { ok: false, message: "유효하지 않은 신청 상태입니다." };
    }

    const { error } = await createSupabaseAdminClient()
      .from("program_applications")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenant.id)
      .eq("id", applicationId);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(`/t/${tenant.slug}/admin/program-applications`);
    return ok("프로그램 신청 상태를 변경했습니다.");
  } catch (error) {
    return fail(error, "프로그램 신청 상태 변경에 실패했습니다.");
  }
}

export async function cancelProgramOrderAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const orderId = String(formData.get("orderId") ?? "").trim();

    if (!orderId) {
      return { ok: false, message: "주문 ID가 없습니다." };
    }

    const { data: order } = await adminSupabase
      .from("program_orders")
      .select("id, tenant_id, status")
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .maybeSingle<{
        id: string;
        tenant_id: string;
        status: string;
      }>();

    if (!order) {
      return { ok: false, message: "주문 정보를 찾을 수 없습니다." };
    }

    if (order.status === "canceled") {
      return { ok: true, message: "이미 취소된 주문입니다." };
    }

    if (order.status !== "pending") {
      return { ok: false, message: "확인 중인 주문만 취소할 수 있습니다." };
    }

    const { error } = await adminSupabase
      .from("program_orders")
      .update({
        status: "canceled",
        fail_reason: null,
      })
      .eq("id", order.id)
      .eq("tenant_id", tenant.id)
      .eq("status", "pending");

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("주문이 취소되었습니다.");
  } catch (error) {
    return fail(error, "주문 취소에 실패했습니다.");
  }
}

export async function updateGuestOrderStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const orderId = String(formData.get("orderId") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();

    if (!orderId) {
      return { ok: false, message: "게스트 주문 ID가 없습니다." };
    }

    if (!isGuestOrderStatus(status)) {
      return { ok: false, message: "변경할 수 없는 게스트 주문 상태입니다." };
    }

    const nowIso = new Date().toISOString();
    const { data: order, error } = await adminSupabase
      .from("guest_orders")
      .update({
        status,
        confirmed_at: status === "confirmed" ? nowIso : null,
        canceled_at: status === "canceled" ? nowIso : null,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", orderId)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) {
      return { ok: false, message: error.message };
    }

    if (!order) {
      return { ok: false, message: "게스트 주문 정보를 찾을 수 없습니다." };
    }

    revalidatePath(`/t/${tenant.slug}/admin/store/guest-orders`);
    return ok("게스트 주문 상태가 변경되었습니다.");
  } catch (error) {
    return fail(error, "게스트 주문 상태 변경에 실패했습니다.");
  }
}

export async function createTenantProgramAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
    const mobileVisibility = parseProgramMobileVisibility(formData.get("mobileVisibility"));
    const difficulty = parseProgramDifficulty(formData.get("difficulty"));
    const displayOrder = parseIntegerField(formData.get("displayOrder"), 0);
    const dailyWorkoutMinutes = parseIntegerField(formData.get("dailyWorkoutMinutes"), 60);
    const daysPerWeek = parseIntegerField(formData.get("daysPerWeek"), 5);
    const deliveryMode = parseProgramDeliveryMode(formData.get("deliveryMode"));
    const contentStartsOn = String(formData.get("contentStartsOn") ?? "").trim() || null;
    const contentEndsOn = String(formData.get("contentEndsOn") ?? "").trim() || null;
    const startDate = String(formData.get("startDate") ?? "").trim();
    const endDate = String(formData.get("endDate") ?? "").trim();

    if (!title || !startDate || !endDate) {
      return { ok: false, message: "프로그램명, 시작일, 종료일은 필수입니다." };
    }

    if (dailyWorkoutMinutes < 10 || dailyWorkoutMinutes > 300) {
      return { ok: false, message: "하루 운동 시간은 10~300분 사이여야 합니다." };
    }

    if (daysPerWeek < 1 || daysPerWeek > 7) {
      return { ok: false, message: "주당 운동일은 1~7일 사이여야 합니다." };
    }

    if (displayOrder < 0) {
      return { ok: false, message: "노출 우선순위는 0 이상이어야 합니다." };
    }

    if (deliveryMode === "cohort_based" && (!contentStartsOn || !contentEndsOn)) {
      return { ok: false, message: "기수제 프로그램은 콘텐츠 기준 시작일과 종료일이 필요합니다." };
    }

    if (deliveryMode === "cohort_based" && contentStartsOn && contentEndsOn && contentStartsOn > contentEndsOn) {
      return { ok: false, message: "콘텐츠 기준 종료일은 시작일 이후여야 합니다." };
    }

    const { data, error } = await adminSupabase
      .from("programs")
      .insert({
        tenant_id: tenant.id,
        title,
        team_name: title,
        slogan: title,
        description,
        coach_name: "",
        coach_instagram: "",
        coach_career: [],
        start_date: startDate,
        end_date: endDate,
        thumbnail_url: thumbnailUrl,
        mobile_visibility: mobileVisibility,
        display_order: displayOrder,
        difficulty,
        daily_workout_minutes: dailyWorkoutMinutes,
        days_per_week: daysPerWeek,
        delivery_mode: deliveryMode,
        content_starts_on: deliveryMode === "cohort_based" ? contentStartsOn : null,
        content_ends_on: deliveryMode === "cohort_based" ? contentEndsOn : null,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return { ok: false, message: error.message };
    }

    if (deliveryMode === "cohort_based" && contentStartsOn) {
      const { error: cohortError } = await adminSupabase.from("program_cohorts").insert({
        tenant_id: tenant.id,
        program_id: data.id,
        name: "1기",
        starts_on: contentStartsOn,
        is_default: true,
      });

      if (cohortError) {
        return {
          ok: false,
          message: `프로그램은 생성되었지만 기본 기수 생성에 실패했습니다: ${cohortError.message}`,
        };
      }
    }

    const { data: createdProduct, error: productError } = await adminSupabase
      .from("program_products")
      .insert({
        tenant_id: tenant.id,
        program_id: data.id,
        price_krw: 99000,
        sale_status: "preparing",
        is_active: false,
      })
      .select("id")
      .maybeSingle<{ id: string }>();

    if (productError) {
      return {
        ok: false,
        message: `프로그램은 생성되었지만 스토어 상품 자동 생성에 실패했습니다: ${productError.message}`,
      };
    }

    if (createdProduct?.id) {
      await adminSupabase.from("program_product_duration_options").upsert(
        {
          product_id: createdProduct.id,
          duration_months: 1,
          price_krw: 99000,
          is_enabled: true,
        },
        { onConflict: "product_id,duration_months" }
      );
    }

    refreshTrainingPages(tenant.slug);
    return { ok: true, message: "프로그램이 생성되었습니다.", programId: data.id };
  } catch (error) {
    return fail(error, "프로그램 생성에 실패했습니다.");
  }
}

export async function updateTenantProgramAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();

    const id = String(formData.get("id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
    const mobileVisibility = parseProgramMobileVisibility(formData.get("mobileVisibility"));
    const difficulty = parseProgramDifficulty(formData.get("difficulty"));
    const displayOrder = parseIntegerField(formData.get("displayOrder"), 0);
    const dailyWorkoutMinutes = parseIntegerField(formData.get("dailyWorkoutMinutes"), 60);
    const daysPerWeek = parseIntegerField(formData.get("daysPerWeek"), 5);
    const deliveryMode = parseProgramDeliveryMode(formData.get("deliveryMode"));
    const contentStartsOn = String(formData.get("contentStartsOn") ?? "").trim() || null;
    const contentEndsOn = String(formData.get("contentEndsOn") ?? "").trim() || null;
    const startDate = String(formData.get("startDate") ?? "").trim();
    const endDate = String(formData.get("endDate") ?? "").trim();
    const selectedCoachProfileIds = canManageMembers ? parseCoachProfileIds(formData.getAll("coachProfileIds")) : [];
    const requestedPrimaryCoachProfileId = canManageMembers ? String(formData.get("primaryCoachProfileId") ?? "").trim() : "";

    if (!id || !title || !startDate || !endDate) {
      return { ok: false, message: "프로그램명, 시작일, 종료일은 필수입니다." };
    }

    if (dailyWorkoutMinutes < 10 || dailyWorkoutMinutes > 300) {
      return { ok: false, message: "하루 운동 시간은 10~300분 사이여야 합니다." };
    }

    if (daysPerWeek < 1 || daysPerWeek > 7) {
      return { ok: false, message: "주당 운동일은 1~7일 사이여야 합니다." };
    }

    if (displayOrder < 0) {
      return { ok: false, message: "노출 우선순위는 0 이상이어야 합니다." };
    }

    if (deliveryMode === "cohort_based" && (!contentStartsOn || !contentEndsOn)) {
      return { ok: false, message: "기수제 프로그램은 콘텐츠 기준 시작일과 종료일이 필요합니다." };
    }

    if (deliveryMode === "cohort_based" && contentStartsOn && contentEndsOn && contentStartsOn > contentEndsOn) {
      return { ok: false, message: "콘텐츠 기준 종료일은 시작일 이후여야 합니다." };
    }

    const primaryCoachProfileId = selectedCoachProfileIds.length === 0 ? "" : requestedPrimaryCoachProfileId || selectedCoachProfileIds[0];

    if (primaryCoachProfileId && !selectedCoachProfileIds.includes(primaryCoachProfileId)) {
      return { ok: false, message: "대표 코치는 선택한 코치 목록 안에서 지정해 주세요." };
    }

    const { data: coachProfiles, error: coachProfilesError } = selectedCoachProfileIds.length
      ? await adminSupabase
          .from("coach_profiles")
          .select("id, display_name, instagram, career")
          .eq("tenant_id", tenant.id)
          .in("id", selectedCoachProfileIds)
          .returns<Array<{ id: string; display_name: string; instagram: string; career: unknown }>>()
      : { data: [] as Array<{ id: string; display_name: string; instagram: string; career: unknown }>, error: null };

    if (coachProfilesError) {
      return { ok: false, message: coachProfilesError.message };
    }

    if ((coachProfiles ?? []).length !== selectedCoachProfileIds.length) {
      return { ok: false, message: "선택한 코치 정보 중 일부를 찾을 수 없습니다." };
    }

    const primaryCoach = (coachProfiles ?? []).find((coach) => coach.id === primaryCoachProfileId) ?? null;

    const { error } = await adminSupabase
      .from("programs")
      .update({
        title,
        team_name: title,
        slogan: title,
        description,
        ...(canManageMembers
          ? {
              coach_name: primaryCoach?.display_name?.trim() || "",
              coach_instagram: primaryCoach?.instagram?.trim() || "",
              coach_career: primaryCoach ? toStringArray(primaryCoach.career) : [],
            }
          : {}),
        thumbnail_url: thumbnailUrl,
        mobile_visibility: mobileVisibility,
        display_order: displayOrder,
        difficulty,
        daily_workout_minutes: dailyWorkoutMinutes,
        days_per_week: daysPerWeek,
        delivery_mode: deliveryMode,
        content_starts_on: deliveryMode === "cohort_based" ? contentStartsOn : null,
        content_ends_on: deliveryMode === "cohort_based" ? contentEndsOn : null,
        start_date: startDate,
        end_date: endDate,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    if (canManageMembers) {
      const { error: deleteProgramCoachError } = await adminSupabase.from("program_coaches").delete().eq("program_id", id);
      if (deleteProgramCoachError) {
        return { ok: false, message: deleteProgramCoachError.message };
      }

      if (selectedCoachProfileIds.length > 0) {
        const assignments = selectedCoachProfileIds.map((coachProfileId, index) => ({
          program_id: id,
          coach_profile_id: coachProfileId,
          is_primary: coachProfileId === primaryCoachProfileId,
          sort_order: index,
        }));

        const { error: insertProgramCoachError } = await adminSupabase.from("program_coaches").insert(assignments);
        if (insertProgramCoachError) {
          return { ok: false, message: insertProgramCoachError.message };
        }
      }
    }

    refreshTrainingPages(tenant.slug);
    revalidatePath(`/t/${tenant.slug}/admin/program/${id}`);
    return ok("프로그램이 저장되었습니다.");
  } catch (error) {
    return fail(error, "프로그램 저장에 실패했습니다.");
  }
}

export async function deleteTenantProgramAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "프로그램 ID가 없습니다." };
    }

    const confirmCascadeDelete = String(formData.get("confirmCascadeDelete") ?? "") === "true";
    if (!confirmCascadeDelete) {
      return { ok: false, message: "연결된 세션까지 삭제된다는 확인이 필요합니다." };
    }

    const { data: products } = await adminSupabase
      .from("program_products")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("program_id", id)
      .returns<Array<{ id: string }>>();
    void products;

    const { error } = await adminSupabase.from("programs").delete().eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("프로그램이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "프로그램 삭제에 실패했습니다.");
  }
}

export async function createProgramCohortAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const programId = String(formData.get("programId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const startsOn = String(formData.get("startsOn") ?? "").trim();
    const isDefault = String(formData.get("isDefault") ?? "") === "true";

    if (!programId || !name || !startsOn) {
      return { ok: false, message: "기수명과 시작일을 입력해 주세요." };
    }

    const { data: program } = await adminSupabase
      .from("programs")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", programId)
      .maybeSingle<{ id: string }>();

    if (!program) {
      return { ok: false, message: "프로그램을 찾지 못했습니다." };
    }

    if (isDefault) {
      const { error: unsetError } = await adminSupabase
        .from("program_cohorts")
        .update({ is_default: false })
        .eq("tenant_id", tenant.id)
        .eq("program_id", programId);

      if (unsetError) {
        return { ok: false, message: unsetError.message };
      }
    }

    const { error } = await adminSupabase.from("program_cohorts").insert({
      tenant_id: tenant.id,
      program_id: programId,
      name,
      starts_on: startsOn,
      is_default: isDefault,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(`/t/${tenant.slug}/admin/program/${programId}`);
    return ok("기수가 추가되었습니다.");
  } catch (error) {
    return fail(error, "기수 추가에 실패했습니다.");
  }
}

export async function updateProgramCohortAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const cohortId = String(formData.get("cohortId") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const startsOn = String(formData.get("startsOn") ?? "").trim();
    const isDefault = String(formData.get("isDefault") ?? "") === "true";

    if (!cohortId || !programId || !name || !startsOn) {
      return { ok: false, message: "기수명과 시작일을 입력해 주세요." };
    }

    const { data: cohort } = await adminSupabase
      .from("program_cohorts")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("program_id", programId)
      .eq("id", cohortId)
      .maybeSingle<{ id: string }>();

    if (!cohort) {
      return { ok: false, message: "기수를 찾지 못했습니다." };
    }

    if (isDefault) {
      const { error: unsetError } = await adminSupabase
        .from("program_cohorts")
        .update({ is_default: false })
        .eq("tenant_id", tenant.id)
        .eq("program_id", programId)
        .neq("id", cohortId);

      if (unsetError) {
        return { ok: false, message: unsetError.message };
      }
    }

    const { error } = await adminSupabase
      .from("program_cohorts")
      .update({
        name,
        starts_on: startsOn,
        is_default: isDefault,
      })
      .eq("tenant_id", tenant.id)
      .eq("program_id", programId)
      .eq("id", cohortId);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(`/t/${tenant.slug}/admin/program/${programId}`);
    return ok("기수가 저장되었습니다.");
  } catch (error) {
    return fail(error, "기수 저장에 실패했습니다.");
  }
}

export async function deleteProgramCohortAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const cohortId = String(formData.get("cohortId") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();

    if (!cohortId || !programId) {
      return { ok: false, message: "기수 ID가 없습니다." };
    }

    const { count } = await adminSupabase
      .from("program_entitlements")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("program_id", programId)
      .eq("cohort_id", cohortId);

    if ((count ?? 0) > 0) {
      return { ok: false, message: "해당 기수를 사용하는 프로그램 권한이 있어 삭제할 수 없습니다." };
    }

    const { error } = await adminSupabase
      .from("program_cohorts")
      .delete()
      .eq("tenant_id", tenant.id)
      .eq("program_id", programId)
      .eq("id", cohortId);

    if (error) {
      return { ok: false, message: error.message };
    }

    revalidatePath(`/t/${tenant.slug}/admin/program/${programId}`);
    return ok("기수가 삭제되었습니다.");
  } catch (error) {
    return fail(error, "기수 삭제에 실패했습니다.");
  }
}

export async function updateProgramProductAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));

    const id = String(formData.get("id") ?? "").trim();
    const saleStatusRaw = String(formData.get("saleStatus") ?? "private").trim();
    const saleStatus =
      saleStatusRaw === "active" || saleStatusRaw === "preparing" || saleStatusRaw === "private"
        ? saleStatusRaw
        : "private";
    const isActive = saleStatus === "active";
    const saleType = String(formData.get("saleType") ?? "one_time") === "subscription" ? "subscription" : "one_time";
    const billingInterval = saleType === "subscription" ? "monthly" : null;
    const billingAnchorDayValue = String(formData.get("billingAnchorDay") ?? "").trim();
    const billingAnchorDay = billingAnchorDayValue === "" ? null : Number(billingAnchorDayValue);
    const graceDaysRaw = Number(formData.get("subscriptionGraceDays"));
    const subscriptionGraceDays = Number.isInteger(graceDaysRaw) ? graceDaysRaw : 3;
    const subscriptionPrice = Number(formData.get("priceKrw"));
    const thumbnailUrlsRaw = String(formData.get("thumbnailUrls") ?? "[]");
    const introImageUrl = String(formData.get("introImageUrl") ?? "").trim();
    const contentHtmlRaw = String(formData.get("contentHtml") ?? "");
    const durationOptions = parseDurationOptions(formData.get("durationOptions"), Number.isFinite(subscriptionPrice) ? Math.floor(subscriptionPrice) : 99000);

    if (!id) {
      return { ok: false, message: "상품 ID가 없습니다." };
    }

    if (saleType === "subscription" && (!Number.isFinite(subscriptionPrice) || subscriptionPrice <= 0)) {
      return { ok: false, message: "유효한 가격을 입력해 주세요." };
    }

    if (saleType === "one_time" && !durationOptions) {
      return { ok: false, message: "기간권 옵션 데이터 형식이 올바르지 않습니다." };
    }

    if (saleType === "subscription") {
      if (billingAnchorDay !== null && (!Number.isInteger(billingAnchorDay) || billingAnchorDay < 1 || billingAnchorDay > 28)) {
        return { ok: false, message: "정기 결제일은 1~28일 사이여야 합니다." };
      }

      if (subscriptionGraceDays < 0 || subscriptionGraceDays > 30) {
        return { ok: false, message: "유예 기간은 0~30일 사이여야 합니다." };
      }
    }

    let thumbnailUrls: string[] = [];
    try {
      const parsed = JSON.parse(thumbnailUrlsRaw);
      thumbnailUrls = Array.isArray(parsed)
        ? parsed.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
        : [];
    } catch {
      return { ok: false, message: "썸네일 데이터 형식이 올바르지 않습니다." };
    }

    const contentHtml = sanitizeSessionContent(contentHtmlRaw);

    const enabledDurationOptions = durationOptions?.filter((option) => option.is_enabled) ?? [];

    if (saleType === "one_time") {
      if (enabledDurationOptions.length === 0) {
        return { ok: false, message: "최소 한 개 이상의 기간권 옵션을 활성화해 주세요." };
      }

      if (durationOptions?.some((option) => option.price_krw < 1000)) {
        return { ok: false, message: "기간권 가격은 1,000원 이상이어야 합니다." };
      }
    }

    const nextPrice =
      saleType === "subscription"
        ? Math.floor(subscriptionPrice)
        : enabledDurationOptions.map((option) => option.price_krw).sort((a, b) => a - b)[0];

    const { error } = await supabase
      .from("program_products")
      .update({
        price_krw: nextPrice,
        sale_status: saleStatus,
        is_active: isActive,
        sale_type: saleType,
        billing_interval: billingInterval,
        billing_anchor_day: saleType === "subscription" ? billingAnchorDay : null,
        subscription_grace_days: saleType === "subscription" ? subscriptionGraceDays : 3,
        thumbnail_urls: thumbnailUrls,
        intro_image_url: introImageUrl,
        content_html: contentHtml,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    if (saleType === "one_time" && durationOptions) {
      const { error: durationOptionError } = await supabase.from("program_product_duration_options").upsert(
        durationOptions.map((option) => ({
          product_id: id,
          duration_months: option.duration_months,
          price_krw: option.price_krw,
          is_enabled: option.is_enabled,
        })),
        { onConflict: "product_id,duration_months" }
      );

      if (durationOptionError) {
        return { ok: false, message: durationOptionError.message };
      }
    }

    refreshTrainingPages(tenant.slug);
    return ok("상품 설정이 저장되었습니다.");
  } catch (error) {
    return fail(error, "상품 설정 저장에 실패했습니다.");
  }
}

export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));

    const payload = parseSessionPayload(formData);
    validateSessionPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);
    const savedContentHtml = sanitizedHtml && sanitizedHtml !== "<p></p>" ? sanitizedHtml : "";

    if (payload.sessionType === "training" && !savedContentHtml) {
      return { ok: false, message: "세션 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase.from("sessions").insert({
      tenant_id: tenant.id,
      program_id: payload.programId,
      session_date: payload.sessionDate,
      title: payload.title,
      content_html: savedContentHtml,
      is_published: payload.isPublished,
      publish_at: payload.isPublished ? payload.publishAt : null,
      session_type: payload.sessionType,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("세션이 추가되었습니다.");
  } catch (error) {
    return fail(error, "세션 추가에 실패했습니다.");
  }
}

export async function updateSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "수정할 세션 ID가 없습니다." };
    }

    const payload = parseSessionPayload(formData);
    validateSessionPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);
    const savedContentHtml = sanitizedHtml && sanitizedHtml !== "<p></p>" ? sanitizedHtml : "";

    if (payload.sessionType === "training" && !savedContentHtml) {
      return { ok: false, message: "세션 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase
      .from("sessions")
      .update({
        tenant_id: tenant.id,
        program_id: payload.programId,
        session_date: payload.sessionDate,
        title: payload.title,
        content_html: savedContentHtml,
        is_published: payload.isPublished,
        publish_at: payload.isPublished ? payload.publishAt : null,
        session_type: payload.sessionType,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("세션이 수정되었습니다.");
  } catch (error) {
    return fail(error, "세션 수정에 실패했습니다.");
  }
}

export async function deleteSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "삭제할 세션 ID가 없습니다." };
    }

    const { error } = await supabase.from("sessions").delete().eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("세션이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "세션 삭제에 실패했습니다.");
  }
}

export async function createNoticeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const payload = parseNoticePayload(formData);
    validateNoticePayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "공지 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase.from("notices").insert({
      tenant_id: tenant.id,
      title: payload.title,
      content_html: sanitizedHtml,
      thumbnail_url: payload.thumbnailUrl,
      is_published: payload.isPublished,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("공지사항이 등록되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 등록에 실패했습니다.");
  }
}

export async function updateNoticeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "수정할 공지 ID가 없습니다." };
    }

    const payload = parseNoticePayload(formData);
    validateNoticePayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "공지 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase
      .from("notices")
      .update({
        tenant_id: tenant.id,
        title: payload.title,
        content_html: sanitizedHtml,
        thumbnail_url: payload.thumbnailUrl,
        is_published: payload.isPublished,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("공지사항이 수정되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 수정에 실패했습니다.");
  }
}

export async function deleteNoticeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "삭제할 공지 ID가 없습니다." };
    }

    const { error } = await supabase.from("notices").delete().eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("공지사항이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 삭제에 실패했습니다.");
  }
}

export async function toggleNoticePublishedAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "대상 공지 ID가 없습니다." };
    }

    const nextPublished = String(formData.get("nextPublished") ?? "false") === "true";

    const { error } = await supabase
      .from("notices")
      .update({ is_published: nextPublished })
      .eq("tenant_id", tenant.id)
      .eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok(nextPublished ? "공지사항이 공개되었습니다." : "공지사항이 비공개되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 상태 변경에 실패했습니다.");
  }
}

export async function createOfflineClassAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const payload = parseOfflineClassPayload(formData);
    validateOfflineClassPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);
    const coachProfileId = await validateOfflineClassCoachProfile(supabase, tenant.id, payload.coachProfileId);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "클래스 설명 본문을 입력해 주세요." };
    }

    const { error } = await supabase.from("offline_classes").insert({
      tenant_id: tenant.id,
      title: payload.title,
      content_html: sanitizedHtml,
      thumbnail_url: payload.thumbnailUrl || null,
      location_text: payload.locationText,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      capacity: payload.capacity,
      is_published: payload.isPublished,
      mobile_visibility: payload.mobileVisibility,
      coach_profile_id: coachProfileId,
      created_by: user.id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("오프라인 클래스가 등록되었습니다.");
  } catch (error) {
    return fail(error, "오프라인 클래스 등록에 실패했습니다.");
  }
}

export async function updateOfflineClassAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "수정할 클래스 ID가 없습니다." };
    }

    const payload = parseOfflineClassPayload(formData);
    validateOfflineClassPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);
    const coachProfileId = await validateOfflineClassCoachProfile(supabase, tenant.id, payload.coachProfileId);

    const { count: participantCount, error: countError } = await supabase
      .from("offline_class_registrations")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("class_id", id);

    if (countError) {
      return { ok: false, message: countError.message };
    }

    if ((participantCount ?? 0) > payload.capacity) {
      return { ok: false, message: "현재 신청 인원보다 작은 정원으로는 저장할 수 없습니다." };
    }

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "클래스 설명 본문을 입력해 주세요." };
    }

    const { error } = await supabase
      .from("offline_classes")
      .update({
        tenant_id: tenant.id,
        title: payload.title,
        content_html: sanitizedHtml,
        thumbnail_url: payload.thumbnailUrl || null,
        location_text: payload.locationText,
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
        capacity: payload.capacity,
        is_published: payload.isPublished,
        mobile_visibility: payload.mobileVisibility,
        coach_profile_id: coachProfileId,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("오프라인 클래스가 수정되었습니다.");
  } catch (error) {
    return fail(error, "오프라인 클래스 수정에 실패했습니다.");
  }
}

export async function deleteOfflineClassAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "삭제할 클래스 ID가 없습니다." };
    }

    const { error } = await supabase.from("offline_classes").delete().eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("오프라인 클래스가 삭제되었습니다.");
  } catch (error) {
    return fail(error, "오프라인 클래스 삭제에 실패했습니다.");
  }
}

export async function toggleOfflineClassPublishedAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "대상 클래스 ID가 없습니다." };
    }

    const nextPublished = String(formData.get("nextPublished") ?? "false") === "true";
    const { error } = await supabase
      .from("offline_classes")
      .update({ is_published: nextPublished })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok(nextPublished ? "클래스가 공개되었습니다." : "클래스가 비공개되었습니다.");
  } catch (error) {
    return fail(error, "클래스 상태 변경에 실패했습니다.");
  }
}

export async function grantAccessByEmailAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));

    if (!canManageMembers) {
      return { ok: false, message: "이메일 권한 부여는 owner 권한이 필요합니다." };
    }

    const payload = parseGrantByEmailPayload(formData);
    validateGrantByEmailPayload(payload);

    const { data: program } = await supabase
      .from("programs")
      .select("id, delivery_mode, content_starts_on, content_ends_on, end_date")
      .eq("tenant_id", tenant.id)
      .eq("id", payload.programId)
      .maybeSingle<ProgramEntitlementGrantProgram>();

    if (!program) {
      return { ok: false, message: "대상 프로그램을 찾지 못했습니다." };
    }

    const adminSupabase = createSupabaseAdminClient();
    const usersResult = await adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = usersResult.data?.users ?? [];
    const targetUser = users.find((candidate) => (candidate.email ?? "").trim().toLowerCase() === payload.email);

    if (!targetUser) {
      return { ok: false, message: "해당 이메일 사용자 계정을 찾지 못했습니다." };
    }

    const { data: existingMembership } = await adminSupabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", targetUser.id)
      .maybeSingle<{ role: "owner" | "coach" | "member" }>();

    const nextMembershipRole = existingMembership
      ? rolePriority(existingMembership.role) >= rolePriority(payload.role) ? existingMembership.role : payload.role
      : payload.role;

    const { error: membershipError } = await adminSupabase.from("tenant_memberships").upsert(
      {
        tenant_id: tenant.id,
        user_id: targetUser.id,
        role: nextMembershipRole,
      },
      { onConflict: "tenant_id,user_id" }
    );

    if (membershipError) {
      return { ok: false, message: membershipError.message };
    }

    const profileUpsertError = await upsertTenantUserProfileForMember(adminSupabase, tenant.id, targetUser);
    if (profileUpsertError) {
      return { ok: false, message: profileUpsertError.message };
    }

    const nowIso = new Date().toISOString();
    const entitlementPayload = await buildProgramEntitlementPayload({
      supabase: adminSupabase,
      tenantId: tenant.id,
      program,
      nowIso,
      requestedCohortId: payload.cohortId,
    });

    const { data: existingEntitlements } = await adminSupabase
      .from("program_entitlements")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", targetUser.id)
      .eq("program_id", program.id)
      .eq("is_active", true)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .limit(1)
      .returns<Array<{ id: string }>>();

    if ((existingEntitlements ?? []).length === 0) {
      const { error: entitlementError } = await adminSupabase.from("program_entitlements").insert({
        tenant_id: tenant.id,
        user_id: targetUser.id,
        program_id: program.id,
        source_order_id: null,
        source_invitation_id: null,
        source_granted_by: user.id,
        cohort_id: entitlementPayload.cohort_id,
        starts_at: entitlementPayload.starts_at,
        ends_at: entitlementPayload.ends_at,
        is_active: true,
      });

      if (entitlementError) {
        return { ok: false, message: entitlementError.message };
      }
    }

    const { error: stateError } = await adminSupabase.from("user_program_states").upsert(
      {
        tenant_id: tenant.id,
        user_id: targetUser.id,
        active_program_id: program.id,
      },
      { onConflict: "tenant_id,user_id" }
    );

    if (stateError) {
      return { ok: false, message: stateError.message };
    }

    refreshUserAdminPages(tenant.slug);
    return ok("이메일 사용자에게 프로그램 권한을 부여했습니다.");
  } catch (error) {
    return fail(error, "이메일 권한 부여에 실패했습니다.");
  }
}

export async function searchTenantUserCandidateByEmailAction(formData: FormData): Promise<SearchTenantUserCandidateActionResult> {
  try {
    const { supabase, tenant, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));

    if (!canManageMembers) {
      return { ok: false, message: "유저 검색은 owner 권한이 필요합니다.", user: null };
    }

    const email = normalizeEmail(formData.get("email"));
    if (!email || !isValidEmail(email)) {
      return { ok: false, message: "유효한 이메일을 입력해 주세요.", user: null };
    }

    const candidate = await findTenantUserCandidateByEmail(supabase, tenant.id, email);
    if (!candidate) {
      return { ok: true, message: "해당 이메일의 가입 계정을 찾지 못했습니다.", user: null };
    }

    return {
      ok: true,
      message: candidate.already_member ? "이미 등록된 유저입니다." : "가입된 계정을 찾았습니다.",
      user: candidate,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "이메일 검색에 실패했습니다.",
      user: null,
    };
  }
}

export async function addTenantMemberByEmailAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));

    if (!canManageMembers) {
      return { ok: false, message: "유저 추가는 owner 권한이 필요합니다." };
    }

    const email = normalizeEmail(formData.get("email"));
    if (!email || !isValidEmail(email)) {
      return { ok: false, message: "유효한 이메일을 입력해 주세요." };
    }

    const candidate = await findTenantUserCandidateByEmail(supabase, tenant.id, email);
    if (!candidate) {
      return { ok: false, message: "해당 이메일의 가입 계정을 찾지 못했습니다." };
    }

    if (candidate.already_member) {
      return { ok: false, message: "이미 등록된 유저입니다." };
    }

    const adminSupabase = createSupabaseAdminClient();
    const { error: membershipError } = await adminSupabase.from("tenant_memberships").insert({
      tenant_id: tenant.id,
      user_id: candidate.user_id,
      role: "member",
    });

    if (membershipError) {
      if (membershipError.code === "23505") {
        return { ok: false, message: "이미 등록된 유저입니다." };
      }

      return { ok: false, message: membershipError.message };
    }

    const profileUpsertError = await upsertTenantUserProfileForMember(adminSupabase, tenant.id, {
      id: candidate.user_id,
      email: candidate.email,
      user_metadata: {
        full_name: candidate.full_name,
        avatar_url: candidate.avatar_url ?? undefined,
      },
    });

    if (profileUpsertError) {
      return { ok: false, message: profileUpsertError.message };
    }

    refreshUserAdminPages(tenant.slug);
    return ok("테넌트 유저를 추가했습니다.");
  } catch (error) {
    return fail(error, "유저 추가에 실패했습니다.");
  }
}

export async function revokeProgramAccessAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const userId = String(formData.get("userId") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();

    if (!canManageMembers) {
      return { ok: false, message: "프로그램 권한 취소는 owner 권한이 필요합니다." };
    }

    if (!userId) {
      return { ok: false, message: "사용자 ID가 없습니다." };
    }

    if (!programId) {
      return { ok: false, message: "프로그램 ID가 없습니다." };
    }

    const nowIso = new Date().toISOString();
    const { data: activeEntitlements } = await adminSupabase
      .from("program_entitlements")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId)
      .eq("program_id", programId)
      .eq("is_active", true)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .returns<Array<{ id: string }>>();

    if ((activeEntitlements ?? []).length === 0) {
      return { ok: false, message: "취소할 활성 프로그램 권한이 없습니다." };
    }

    const entitlementIds = (activeEntitlements ?? []).map((entitlement) => entitlement.id);
    const { error: entitlementError } = await adminSupabase
      .from("program_entitlements")
      .update({ is_active: false })
      .in("id", entitlementIds);

    if (entitlementError) {
      return { ok: false, message: entitlementError.message };
    }

    const { data: currentProgramState } = await adminSupabase
      .from("user_program_states")
      .select("active_program_id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId)
      .maybeSingle<{ active_program_id: string | null }>();

    if (currentProgramState?.active_program_id === programId) {
      const { data: nextActiveEntitlement } = await adminSupabase
        .from("program_entitlements")
        .select("program_id")
        .eq("tenant_id", tenant.id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("starts_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ program_id: string }>();

      const nextProgramId = nextActiveEntitlement?.program_id ?? null;
      const { error: stateError } = await adminSupabase.from("user_program_states").upsert(
        {
          tenant_id: tenant.id,
          user_id: userId,
          active_program_id: nextProgramId,
        },
        { onConflict: "tenant_id,user_id" }
      );

      if (stateError) {
        return { ok: false, message: stateError.message };
      }
    }

    refreshUserAdminPages(tenant.slug);
    return ok("프로그램 권한을 취소했습니다.");
  } catch (error) {
    return fail(error, "프로그램 권한 취소에 실패했습니다.");
  }
}

export async function updateProgramEntitlementEndDateAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const entitlementId = String(formData.get("entitlementId") ?? "").trim();
    const endsAt = parseAdminDateTimeInput(String(formData.get("endsAt") ?? ""));

    if (!canManageMembers) {
      return { ok: false, message: "프로그램 권한 변경은 owner 권한이 필요합니다." };
    }

    if (!entitlementId) {
      return { ok: false, message: "권한 ID가 없습니다." };
    }

    const { data: entitlement } = await adminSupabase
      .from("program_entitlements")
      .select("id, user_id, program_id, is_active")
      .eq("tenant_id", tenant.id)
      .eq("id", entitlementId)
      .maybeSingle<{ id: string; user_id: string; program_id: string; is_active: boolean }>();

    if (!entitlement) {
      return { ok: false, message: "수정할 프로그램 권한을 찾지 못했습니다." };
    }

    if (!entitlement.is_active) {
      return { ok: false, message: "비활성 권한은 종료일만으로 다시 활성화할 수 없습니다." };
    }

    const nowIso = new Date().toISOString();
    const nextIsActive = new Date(endsAt).getTime() >= new Date(nowIso).getTime();

    const { error: updateError } = await adminSupabase
      .from("program_entitlements")
      .update({
        ends_at: endsAt,
        is_active: nextIsActive,
      })
      .eq("id", entitlement.id);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    const { data: currentProgramState } = await adminSupabase
      .from("user_program_states")
      .select("active_program_id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", entitlement.user_id)
      .maybeSingle<{ active_program_id: string | null }>();

    if (!nextIsActive && currentProgramState?.active_program_id === entitlement.program_id) {
      const { data: nextActiveEntitlement } = await adminSupabase
        .from("program_entitlements")
        .select("program_id")
        .eq("tenant_id", tenant.id)
        .eq("user_id", entitlement.user_id)
        .eq("is_active", true)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
        .order("starts_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ program_id: string }>();

      const { error: stateError } = await adminSupabase.from("user_program_states").upsert(
        {
          tenant_id: tenant.id,
          user_id: entitlement.user_id,
          active_program_id: nextActiveEntitlement?.program_id ?? null,
        },
        { onConflict: "tenant_id,user_id" }
      );

      if (stateError) {
        return { ok: false, message: stateError.message };
      }
    }

    refreshTrainingPages(tenant.slug);
    return ok(nextIsActive ? "권한 종료일을 변경했습니다." : "권한을 만료 처리했습니다.");
  } catch (error) {
    return fail(error, "권한 종료일 변경에 실패했습니다.");
  }
}

export async function updateUserRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));
    const adminSupabase = createSupabaseAdminClient();
    const userId = String(formData.get("userId") ?? "").trim();
    const role = String(formData.get("role") ?? "").trim();

    if (!canManageMembers) {
      return { ok: false, message: "멤버 권한 변경은 owner 권한이 필요합니다." };
    }

    if (!userId) {
      return { ok: false, message: "사용자 ID가 없습니다." };
    }

    if (role !== "owner" && role !== "coach" && role !== "member") {
      return { ok: false, message: "유효하지 않은 권한 값입니다." };
    }

    const { data: currentMembership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId)
      .maybeSingle<{ role: "owner" | "coach" | "member" }>();

    if (!currentMembership) {
      return { ok: false, message: "해당 사용자의 멤버십을 찾지 못했습니다." };
    }

    if (userId === user.id && role !== "owner") {
      return { ok: false, message: "본인 계정은 owner 권한을 유지해야 합니다." };
    }

    if (currentMembership.role === "owner" && role !== "owner") {
      const { count: ownerCount } = await supabase
        .from("tenant_memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("role", "owner");

      if ((ownerCount ?? 0) <= 1) {
        return { ok: false, message: "마지막 owner의 권한은 변경할 수 없습니다." };
      }
    }

    const { error } = await supabase
      .from("tenant_memberships")
      .update({ role })
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId);

    if (error) {
      return { ok: false, message: error.message };
    }

    const { data: authUser } = await adminSupabase.auth.admin.getUserById(userId);
    if (authUser.user) {
      const profileUpsertError = await upsertTenantUserProfileForMember(adminSupabase, tenant.id, authUser.user);
      if (profileUpsertError) {
        return { ok: false, message: profileUpsertError.message };
      }
    }

    refreshUserAdminPages(tenant.slug);
    return ok("사용자 권한이 변경되었습니다.");
  } catch (error) {
    return fail(error, "사용자 권한 변경에 실패했습니다.");
  }
}

export async function removeTenantMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin(await requireTenantSlug(formData));
    const userId = String(formData.get("userId") ?? "").trim();

    if (!canManageMembers) {
      return { ok: false, message: "멤버 제거는 owner 권한이 필요합니다." };
    }

    if (!userId) {
      return { ok: false, message: "사용자 ID가 없습니다." };
    }

    if (userId === user.id) {
      return { ok: false, message: "본인 계정은 멤버 목록에서 제거할 수 없습니다." };
    }

    const { data: targetMembership } = await supabase
      .from("tenant_memberships")
      .select("role")
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId)
      .maybeSingle<{ role: "owner" | "coach" | "member" }>();

    if (!targetMembership) {
      return { ok: false, message: "해당 멤버십을 찾지 못했습니다." };
    }

    if (targetMembership.role === "owner") {
      const { count: ownerCount } = await supabase
        .from("tenant_memberships")
        .select("user_id", { count: "exact", head: true })
        .eq("tenant_id", tenant.id)
        .eq("role", "owner");

      if ((ownerCount ?? 0) <= 1) {
        return { ok: false, message: "마지막 owner는 제거할 수 없습니다." };
      }
    }

    const { error } = await supabase.from("tenant_memberships").delete().eq("tenant_id", tenant.id).eq("user_id", userId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshUserAdminPages(tenant.slug);
    return ok("멤버가 테넌트에서 제거되었습니다.");
  } catch (error) {
    return fail(error, "멤버 제거에 실패했습니다.");
  }
}

export async function reactivateDeactivatedAccountAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const userId = String(formData.get("userId") ?? "").trim();

    if (!userId) {
      return { ok: false, message: "사용자 ID가 없습니다." };
    }

    const { data: membership } = await supabase
      .from("tenant_memberships")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId)
      .maybeSingle<{ user_id: string }>();

    if (!membership) {
      return { ok: false, message: "해당 테넌트 멤버가 아닙니다." };
    }

    const profile = await getTenantUserProfile(supabase, tenant.id, userId);

    if (!profile || profile.tenant_status !== "deactivated") {
      return { ok: false, message: "이미 활성화된 계정입니다." };
    }

    const { error } = await supabase
      .from("tenant_user_profiles")
      .update({ tenant_status: "active", deactivated_at: null })
      .eq("tenant_id", tenant.id)
      .eq("user_id", userId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshUserAdminPages(tenant.slug);
    revalidatePath(`/t/${tenant.slug}/admin/account/deactivated-users`);
    return ok("계정이 다시 활성화되었습니다.");
  } catch (error) {
    return fail(error, "계정 활성화에 실패했습니다.");
  }
}

export async function changeMyPasswordAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin(await requireTenantSlug(formData));
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (!password || !passwordConfirm) {
      return { ok: false, message: "새 비밀번호와 확인 비밀번호를 입력해 주세요." };
    }

    if (password.length < 8) {
      return { ok: false, message: "비밀번호는 8자 이상으로 입력해 주세요." };
    }

    if (password !== passwordConfirm) {
      return { ok: false, message: "비밀번호가 일치하지 않습니다." };
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      return { ok: false, message: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요." };
    }

    return ok("비밀번호가 변경되었습니다.");
  } catch (error) {
    return fail(error, "비밀번호 변경에 실패했습니다.");
  }
}

export async function setCommunityPostStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const postId = String(formData.get("postId") ?? "").trim();
    const nextStatus = String(formData.get("nextStatus") ?? "").trim() as CommunityPostStatus;

    if (!postId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    if (!["published", "hidden", "deleted"].includes(nextStatus)) {
      return { ok: false, message: "유효하지 않은 상태 값입니다." };
    }

    const { error } = await supabase
      .from("community_posts")
      .update({ status: nextStatus })
      .eq("tenant_id", tenant.id)
      .eq("id", postId);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    revalidatePath(`/t/${tenant.slug}/community/${postId}`);
    return ok("게시글 상태가 변경되었습니다.");
  } catch (error) {
    return fail(error, "게시글 상태 변경에 실패했습니다.");
  }
}

export async function getAdminCommunityPostDetailAction(tenantSlug: string, postId: string): Promise<{
  ok: boolean;
  message: string;
  item?: {
    id: string;
    title: string;
    contentHtml: string;
    images: string[];
    status: CommunityPostStatus;
    createdAt: string;
    authorName: string;
    authorAvatarUrl: string | null;
    comments: AdminCommunityCommentRow[];
  };
}> {
  try {
    const { supabase, tenant } = await ensureAdmin(tenantSlug);
    const normalizedPostId = String(postId ?? "").trim();

    if (!normalizedPostId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    const [{ data: post }, { data: comments }] = await Promise.all([
      supabase
        .from("community_posts")
        .select("id, title, content_html, images, status, created_at, author_id")
        .eq("tenant_id", tenant.id)
        .eq("id", normalizedPostId)
        .maybeSingle<{
          id: string;
          title: string;
          content_html: string | null;
          images: unknown;
          status: CommunityPostStatus;
          created_at: string;
          author_id: string;
        }>(),
      supabase
        .from("community_comments")
        .select("id, post_id, author_id, content_html, status, created_at, updated_at")
        .eq("tenant_id", tenant.id)
        .eq("post_id", normalizedPostId)
        .order("created_at", { ascending: true })
        .returns<
          Array<{
            id: string;
            post_id: string;
            author_id: string;
            content_html: string;
            status: CommunityPostStatus;
            created_at: string;
            updated_at: string;
          }>
        >(),
    ]);

    if (!post) {
      return { ok: false, message: "게시글을 찾을 수 없습니다." };
    }

    const commentRows = comments ?? [];
    const authorIds = [...new Set([post.author_id, ...commentRows.map((comment) => comment.author_id)])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", authorIds)
      .returns<Array<{ id: string; full_name: string | null; avatar_url: string | null }>>();

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        {
          name: toDisplayName(profile.full_name),
          avatarUrl: profile.avatar_url,
        },
      ])
    );
    const authorName = profileMap.get(post.author_id)?.name ?? "Member";
    const images = toStringArray(post.images);

    return {
      ok: true,
      message: "ok",
      item: {
        id: post.id,
        title: post.title,
        contentHtml: post.content_html ?? "",
        images,
        status: post.status,
        createdAt: post.created_at,
        authorName,
        authorAvatarUrl: profileMap.get(post.author_id)?.avatarUrl ?? null,
        comments: commentRows.map((comment) => ({
          id: comment.id,
          post_id: comment.post_id,
          content_html: comment.content_html,
          status: comment.status,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          author_id: comment.author_id,
          author_name: profileMap.get(comment.author_id)?.name ?? "Member",
          author_avatar_url: profileMap.get(comment.author_id)?.avatarUrl ?? null,
        })),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "게시글 상세를 불러오지 못했습니다.",
    };
  }
}

export async function createAdminCommunityCommentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user } = await ensureAdmin(await requireTenantSlug(formData));
    const postId = String(formData.get("postId") ?? "").trim();
    const rawContent = String(formData.get("content") ?? "").trim();

    if (!postId) {
      return { ok: false, message: "게시글 ID가 없습니다." };
    }

    if (!rawContent) {
      return { ok: false, message: "댓글 내용을 입력해 주세요." };
    }

    const { data: post } = await supabase
      .from("community_posts")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", postId)
      .maybeSingle<{ id: string }>();

    if (!post) {
      return { ok: false, message: "게시글을 찾지 못했습니다." };
    }

    const contentHtml = sanitizeSessionContent(rawContent.replace(/\n/g, "<br />"));
    const { error } = await supabase.from("community_comments").insert({
      tenant_id: tenant.id,
      post_id: postId,
      author_id: user.id,
      content_html: contentHtml,
      status: "published",
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    revalidatePath(`/t/${tenant.slug}/community/${postId}`);
    return ok("댓글이 등록되었습니다.");
  } catch (error) {
    return fail(error, "댓글 등록에 실패했습니다.");
  }
}

export async function setAdminCommunityCommentStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const commentId = String(formData.get("commentId") ?? "").trim();
    const postId = String(formData.get("postId") ?? "").trim();
    const nextStatus = String(formData.get("nextStatus") ?? "").trim() as CommunityPostStatus;

    if (!commentId || !postId) {
      return { ok: false, message: "댓글 식별자가 없습니다." };
    }

    if (!["published", "hidden", "deleted"].includes(nextStatus)) {
      return { ok: false, message: "유효하지 않은 상태 값입니다." };
    }

    const { error } = await supabase
      .from("community_comments")
      .update({ status: nextStatus })
      .eq("tenant_id", tenant.id)
      .eq("id", commentId)
      .eq("post_id", postId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    revalidatePath(`/t/${tenant.slug}/community/${postId}`);
    return ok("댓글 상태가 변경되었습니다.");
  } catch (error) {
    return fail(error, "댓글 상태 변경에 실패했습니다.");
  }
}

export async function getAdminUserWorkoutRecordsAction(tenantSlug: string, userId: string): Promise<{
  ok: boolean;
  message: string;
  userName?: string;
  userAvatarUrl?: string | null;
  items?: AdminUserWorkoutRecordRow[];
}> {
  try {
    const { supabase, tenant } = await ensureAdmin(tenantSlug);
    const normalizedUserId = String(userId ?? "").trim();

    if (!normalizedUserId) {
      return { ok: false, message: "유저 ID가 없습니다." };
    }

    const [items, tenantProfile] = await Promise.all([
      getAdminUserWorkoutRecords(supabase, tenantSlug, normalizedUserId),
      getTenantUserProfile(supabase, tenant.id, normalizedUserId),
    ]);

    return {
      ok: true,
      message: "ok",
      userName: resolveTenantDisplayName(tenantProfile, null, null),
      userAvatarUrl: tenantProfile?.avatar_url ?? null,
      items,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "유저 기록을 불러오지 못했습니다.",
    };
  }
}

export async function reviewCommunityPostReportAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const reportId = String(formData.get("reportId") ?? "").trim();
    const nextStatus = String(formData.get("nextStatus") ?? "").trim() as CommunityReportStatus;

    if (!reportId) {
      return { ok: false, message: "신고 ID가 없습니다." };
    }

    if (!["resolved", "rejected"].includes(nextStatus)) {
      return { ok: false, message: "유효하지 않은 신고 처리 상태입니다." };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { error } = await supabase
      .from("community_post_reports")
      .update({
        status: nextStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant.id)
      .eq("id", reportId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("신고 상태가 업데이트되었습니다.");
  } catch (error) {
    return fail(error, "신고 처리에 실패했습니다.");
  }
}

export async function updateProgramSessionReviewFeedbackAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user } = await ensureAdmin(await requireTenantSlug(formData));
    const reviewId = String(formData.get("reviewId") ?? "").trim();
    const coachFeedback = String(formData.get("coachFeedback") ?? "").trim();

    if (!reviewId) {
      return { ok: false, message: "후기 ID가 없습니다." };
    }

    if (coachFeedback.length === 0) {
      return { ok: false, message: "피드백을 입력해 주세요." };
    }

    if (coachFeedback.length > 300) {
      return { ok: false, message: "피드백은 300자 이하로 입력해 주세요." };
    }

    const { error } = await supabase
      .from("program_session_reviews")
      .update({
        coach_feedback: coachFeedback,
        status: "reviewed",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant.id)
      .eq("id", reviewId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("운동 후기에 피드백을 저장했습니다.");
  } catch (error) {
    return fail(error, "운동 후기 피드백 저장에 실패했습니다.");
  }
}

type BookingServicePayload = {
  name: string;
  description: string;
  isActive: boolean;
  pendingHoldMinutes: number;
};

type BookingServiceOptionPayload = {
  serviceId: string;
  name: string;
  description: string;
  priceKrw: number;
  sortOrder: number;
  isEnabled: boolean;
};

type GenerateBookingSlotsPayload = {
  serviceId: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  startHour: number;
  endHour: number;
  durationMinutes: 60 | 90;
};

function parseBookingServicePayload(formData: FormData): BookingServicePayload {
  return {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    isActive: String(formData.get("isActive") ?? "") === "true",
    pendingHoldMinutes: parseIntegerField(formData.get("pendingHoldMinutes"), 0),
  };
}

function validateBookingServicePayload(payload: BookingServicePayload) {
  if (!payload.name) {
    throw new Error("예약 서비스 이름을 입력해 주세요.");
  }

  if (payload.pendingHoldMinutes < 0) {
    throw new Error("보류 시간은 0분 이상이어야 합니다.");
  }
}

function parseBookingServiceOptionPayload(formData: FormData): BookingServiceOptionPayload {
  return {
    serviceId: String(formData.get("serviceId") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    priceKrw: parseIntegerField(formData.get("priceKrw"), 0),
    sortOrder: parseIntegerField(formData.get("sortOrder"), 0),
    isEnabled: String(formData.get("isEnabled") ?? "") === "true",
  };
}

function validateBookingServiceOptionPayload(payload: BookingServiceOptionPayload) {
  if (!payload.serviceId) {
    throw new Error("예약 서비스를 먼저 선택해 주세요.");
  }

  if (!payload.name) {
    throw new Error("옵션 이름을 입력해 주세요.");
  }

  if (!Number.isFinite(payload.priceKrw) || payload.priceKrw <= 0) {
    throw new Error("가격은 1원 이상의 숫자여야 합니다.");
  }
}

function parseIsoDateOnly(raw: FormDataEntryValue | null, label: string) {
  const value = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label}을(를) 올바르게 입력해 주세요.`);
  }

  return value;
}

function parseWeekdays(formData: FormData) {
  return formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value): value is number => Number.isInteger(value) && value >= 0 && value <= 6);
}

function parseBookingDuration(raw: FormDataEntryValue | null): 60 | 90 {
  const value = Number(raw);
  return value === 90 ? 90 : 60;
}

function parseGenerateBookingSlotsPayload(formData: FormData): GenerateBookingSlotsPayload {
  return {
    serviceId: String(formData.get("serviceId") ?? "").trim(),
    startDate: parseIsoDateOnly(formData.get("startDate"), "시작일"),
    endDate: parseIsoDateOnly(formData.get("endDate"), "종료일"),
    weekdays: parseWeekdays(formData),
    startHour: parseIntegerField(formData.get("startHour"), 10),
    endHour: parseIntegerField(formData.get("endHour"), 20),
    durationMinutes: parseBookingDuration(formData.get("durationMinutes")),
  };
}

function validateGenerateBookingSlotsPayload(payload: GenerateBookingSlotsPayload) {
  if (!payload.serviceId) {
    throw new Error("예약 서비스를 먼저 선택해 주세요.");
  }

  if (payload.startDate > payload.endDate) {
    throw new Error("종료일은 시작일과 같거나 더 늦어야 합니다.");
  }

  if (payload.weekdays.length === 0) {
    throw new Error("슬롯을 생성할 요일을 하나 이상 선택해 주세요.");
  }

  if (payload.startHour < 0 || payload.startHour > 23 || payload.endHour < 1 || payload.endHour > 24) {
    throw new Error("운영 시간은 0시부터 24시 사이여야 합니다.");
  }

  if (payload.startHour >= payload.endHour) {
    throw new Error("종료 시간은 시작 시간보다 늦어야 합니다.");
  }
}

function buildKstIso(dateText: string, hour: number, minute: number) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return new Date(`${dateText}T${hh}:${mm}:00+09:00`).toISOString();
}

function getWeekdayInKst(dateText: string) {
  return new Date(`${dateText}T12:00:00+09:00`).getUTCDay();
}

function addDaysToIsoDate(dateText: string, days: number) {
  const base = new Date(`${dateText}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function addMinutesToIso(isoText: string, minutes: number) {
  return new Date(Date.parse(isoText) + minutes * 60 * 1000).toISOString();
}

async function ensureBookingServiceBelongsToTenant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  serviceId: string
) {
  const { data } = await supabase
    .from("booking_services")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("id", serviceId)
    .maybeSingle<{ id: string }>();

  if (!data) {
    throw new Error("예약 서비스를 찾지 못했습니다.");
  }
}

async function ensureBookingOptionBelongsToTenant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  optionId: string
) {
  const { data } = await supabase
    .from("booking_service_options")
    .select("id, booking_services!inner(tenant_id)")
    .eq("id", optionId)
    .eq("booking_services.tenant_id", tenantId)
    .maybeSingle<{ id: string }>();

  if (!data) {
    throw new Error("예약 옵션을 찾지 못했습니다.");
  }
}

async function ensureBookingSlotBelongsToTenant(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  tenantId: string,
  slotId: string
) {
  const { data } = await supabase
    .from("booking_slots")
    .select("id, status")
    .eq("tenant_id", tenantId)
    .eq("id", slotId)
    .maybeSingle<{ id: string; status: BookingSlotStatus }>();

  if (!data) {
    throw new Error("예약 슬롯을 찾지 못했습니다.");
  }

  return data;
}

async function appendBookingReservationStatusLog(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  payload: {
    tenantId: string;
    reservationId: string;
    fromStatus: BookingReservationStatus | null;
    toStatus: BookingReservationStatus;
    changedBy: string;
    reason: string;
  }
) {
  await supabase.from("booking_reservation_status_logs").insert({
    tenant_id: payload.tenantId,
    reservation_id: payload.reservationId,
    from_status: payload.fromStatus,
    to_status: payload.toStatus,
    changed_by: payload.changedBy,
    reason: payload.reason,
  });
}

export async function createBookingServiceAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user } = await ensureAdmin(await requireTenantSlug(formData));
    const payload = parseBookingServicePayload(formData);
    validateBookingServicePayload(payload);

    const { error } = await supabase.from("booking_services").insert({
      tenant_id: tenant.id,
      name: payload.name,
      description: payload.description,
      is_active: payload.isActive,
      pending_hold_minutes: payload.pendingHoldMinutes,
      created_by: user.id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("예약 서비스가 생성되었습니다.");
  } catch (error) {
    return fail(error, "예약 서비스 생성에 실패했습니다.");
  }
}

export async function updateBookingServiceAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const serviceId = String(formData.get("serviceId") ?? "").trim();
    const payload = parseBookingServicePayload(formData);
    validateBookingServicePayload(payload);
    await ensureBookingServiceBelongsToTenant(supabase, tenant.id, serviceId);

    const { error } = await supabase
      .from("booking_services")
      .update({
        name: payload.name,
        description: payload.description,
        is_active: payload.isActive,
        pending_hold_minutes: payload.pendingHoldMinutes,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", serviceId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("예약 서비스가 수정되었습니다.");
  } catch (error) {
    return fail(error, "예약 서비스 수정에 실패했습니다.");
  }
}

export async function deleteBookingServiceAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const serviceId = String(formData.get("serviceId") ?? "").trim();
    await ensureBookingServiceBelongsToTenant(supabase, tenant.id, serviceId);

    const { data: activeReservations } = await supabase
      .from("booking_reservations")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("booking_service_id", serviceId)
      .in("status", ["requested", "confirmed"])
      .limit(1)
      .returns<Array<{ id: string }>>();

    if ((activeReservations ?? []).length > 0) {
      return { ok: false, message: "진행 중인 예약이 있는 서비스는 삭제할 수 없습니다." };
    }

    const { error } = await supabase.from("booking_services").delete().eq("tenant_id", tenant.id).eq("id", serviceId);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("예약 서비스가 삭제되었습니다.");
  } catch (error) {
    return fail(error, "예약 서비스 삭제에 실패했습니다.");
  }
}

export async function createBookingServiceOptionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const payload = parseBookingServiceOptionPayload(formData);
    validateBookingServiceOptionPayload(payload);
    await ensureBookingServiceBelongsToTenant(supabase, tenant.id, payload.serviceId);

    const { error } = await supabase.from("booking_service_options").insert({
      booking_service_id: payload.serviceId,
      name: payload.name,
      description: payload.description,
      price_krw: payload.priceKrw,
      sort_order: payload.sortOrder,
      is_enabled: payload.isEnabled,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("예약 옵션이 추가되었습니다.");
  } catch (error) {
    return fail(error, "예약 옵션 추가에 실패했습니다.");
  }
}

export async function updateBookingServiceOptionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const optionId = String(formData.get("optionId") ?? "").trim();
    const payload = parseBookingServiceOptionPayload(formData);
    validateBookingServiceOptionPayload(payload);
    await ensureBookingServiceBelongsToTenant(supabase, tenant.id, payload.serviceId);
    await ensureBookingOptionBelongsToTenant(supabase, tenant.id, optionId);

    const { error } = await supabase
      .from("booking_service_options")
      .update({
        name: payload.name,
        description: payload.description,
        price_krw: payload.priceKrw,
        sort_order: payload.sortOrder,
        is_enabled: payload.isEnabled,
      })
      .eq("id", optionId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("예약 옵션이 수정되었습니다.");
  } catch (error) {
    return fail(error, "예약 옵션 수정에 실패했습니다.");
  }
}

export async function deleteBookingServiceOptionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const optionId = String(formData.get("optionId") ?? "").trim();
    await ensureBookingOptionBelongsToTenant(supabase, tenant.id, optionId);

    const { data: reservations } = await supabase
      .from("booking_reservations")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("booking_option_id", optionId)
      .limit(1)
      .returns<Array<{ id: string }>>();

    if ((reservations ?? []).length > 0) {
      return { ok: false, message: "예약 이력이 있는 옵션은 삭제할 수 없습니다." };
    }

    const { error } = await supabase.from("booking_service_options").delete().eq("id", optionId);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("예약 옵션이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "예약 옵션 삭제에 실패했습니다.");
  }
}

export async function generateBookingSlotsAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const payload = parseGenerateBookingSlotsPayload(formData);
    validateGenerateBookingSlotsPayload(payload);
    await ensureBookingServiceBelongsToTenant(supabase, tenant.id, payload.serviceId);

    const { data: existingSlots } = await supabase
      .from("booking_slots")
      .select("starts_at")
      .eq("tenant_id", tenant.id)
      .eq("booking_service_id", payload.serviceId)
      .gte("slot_date", payload.startDate)
      .lte("slot_date", payload.endDate)
      .returns<Array<{ starts_at: string }>>();

    const existingStartSet = new Set((existingSlots ?? []).map((slot) => slot.starts_at));
    const rows: Array<{
      tenant_id: string;
      booking_service_id: string;
      slot_date: string;
      starts_at: string;
      ends_at: string;
      duration_minutes: 60 | 90;
      status: BookingSlotStatus;
    }> = [];

    let cursor = payload.startDate;
    while (cursor <= payload.endDate) {
      if (payload.weekdays.includes(getWeekdayInKst(cursor))) {
        for (let hour = payload.startHour; hour < payload.endHour; hour += 1) {
          const startsAt = buildKstIso(cursor, hour, 0);
          const endsAt = addMinutesToIso(startsAt, payload.durationMinutes);
          if (Date.parse(endsAt) > Date.parse(buildKstIso(cursor, payload.endHour, 0))) {
            continue;
          }

          if (existingStartSet.has(startsAt)) {
            continue;
          }

          rows.push({
            tenant_id: tenant.id,
            booking_service_id: payload.serviceId,
            slot_date: cursor,
            starts_at: startsAt,
            ends_at: endsAt,
            duration_minutes: payload.durationMinutes,
            status: "open",
          });
          existingStartSet.add(startsAt);
        }
      }

      cursor = addDaysToIsoDate(cursor, 1);
    }

    if (rows.length === 0) {
      return { ok: true, message: "추가로 생성할 슬롯이 없습니다." };
    }

    const { error } = await supabase.from("booking_slots").insert(rows);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok(`${rows.length}개의 예약 슬롯을 생성했습니다.`);
  } catch (error) {
    return fail(error, "예약 슬롯 생성에 실패했습니다.");
  }
}

export async function updateBookingSlotStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const slotId = String(formData.get("slotId") ?? "").trim();
    const nextStatus = String(formData.get("status") ?? "open").trim() as BookingSlotStatus;

    if (!["open", "pending", "booked", "blocked", "closed"].includes(nextStatus)) {
      throw new Error("유효한 슬롯 상태가 아닙니다.");
    }

    const slot = await ensureBookingSlotBelongsToTenant(supabase, tenant.id, slotId);
    if (slot.status === nextStatus) {
      return ok("슬롯 상태가 이미 설정되어 있습니다.");
    }

    if (nextStatus === "open") {
      const { data: activeReservations } = await supabase
        .from("booking_reservations")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("slot_id", slotId)
        .in("status", ["requested", "confirmed"])
        .limit(1)
        .returns<Array<{ id: string }>>();

      if ((activeReservations ?? []).length > 0) {
        return { ok: false, message: "진행 중인 예약이 있어 슬롯을 다시 열 수 없습니다." };
      }
    }

    const { error } = await supabase.from("booking_slots").update({ status: nextStatus }).eq("tenant_id", tenant.id).eq("id", slotId);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("슬롯 상태가 변경되었습니다.");
  } catch (error) {
    return fail(error, "슬롯 상태 변경에 실패했습니다.");
  }
}

export async function deleteBookingSlotAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin(await requireTenantSlug(formData));
    const slotId = String(formData.get("slotId") ?? "").trim();
    await ensureBookingSlotBelongsToTenant(supabase, tenant.id, slotId);

    const { data: activeReservations } = await supabase
      .from("booking_reservations")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("slot_id", slotId)
      .in("status", ["requested", "confirmed"])
      .limit(1)
      .returns<Array<{ id: string }>>();

    if ((activeReservations ?? []).length > 0) {
      return { ok: false, message: "진행 중인 예약이 있는 슬롯은 삭제할 수 없습니다." };
    }

    const { error } = await supabase.from("booking_slots").delete().eq("tenant_id", tenant.id).eq("id", slotId);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("예약 슬롯이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "예약 슬롯 삭제에 실패했습니다.");
  }
}

export async function updateBookingReservationStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user } = await ensureAdmin(await requireTenantSlug(formData));
    const reservationId = String(formData.get("reservationId") ?? "").trim();
    const nextStatus = String(formData.get("status") ?? "confirmed").trim() as BookingReservationStatus;
    const adminMemo = String(formData.get("adminMemo") ?? "").trim();

    if (!["confirmed", "rejected", "canceled", "completed", "no_show"].includes(nextStatus)) {
      throw new Error("관리 화면에서 변경할 수 없는 예약 상태입니다.");
    }

    const { data: reservation } = await supabase
      .from("booking_reservations")
      .select("id, tenant_id, slot_id, status")
      .eq("tenant_id", tenant.id)
      .eq("id", reservationId)
      .maybeSingle<{ id: string; tenant_id: string; slot_id: string; status: BookingReservationStatus }>();

    if (!reservation) {
      return { ok: false, message: "예약 주문을 찾지 못했습니다." };
    }

    const updatePayload: {
      status: BookingReservationStatus;
      admin_memo: string;
      confirmed_at?: string | null;
      confirmed_by?: string | null;
      canceled_at?: string | null;
      canceled_by?: string | null;
    } = {
      status: nextStatus,
      admin_memo: adminMemo,
    };

    let nextSlotStatus: BookingSlotStatus = "pending";
    if (nextStatus === "confirmed") {
      const { data: existingConfirmed } = await supabase
        .from("booking_reservations")
        .select("id")
        .eq("tenant_id", tenant.id)
        .eq("slot_id", reservation.slot_id)
        .eq("status", "confirmed")
        .neq("id", reservation.id)
        .limit(1)
        .maybeSingle<{ id: string }>();

      if (existingConfirmed) {
        return { ok: false, message: "이미 다른 예약이 확정된 슬롯입니다. 후순위 예약은 취소 또는 거절해 주세요." };
      }

      updatePayload.confirmed_at = new Date().toISOString();
      updatePayload.confirmed_by = user.id;
      nextSlotStatus = "booked";
    } else if (nextStatus === "completed" || nextStatus === "no_show") {
      nextSlotStatus = "booked";
    } else {
      updatePayload.canceled_at = new Date().toISOString();
      updatePayload.canceled_by = user.id;
      nextSlotStatus = "open";
    }

    const { error: reservationError } = await supabase
      .from("booking_reservations")
      .update(updatePayload)
      .eq("tenant_id", tenant.id)
      .eq("id", reservationId);
    if (reservationError) {
      return { ok: false, message: reservationError.message };
    }

    const { error: slotError } = await supabase
      .from("booking_slots")
      .update({ status: nextSlotStatus })
      .eq("tenant_id", tenant.id)
      .eq("id", reservation.slot_id);
    if (slotError) {
      return { ok: false, message: slotError.message };
    }

    await appendBookingReservationStatusLog(supabase, {
      tenantId: tenant.id,
      reservationId,
      fromStatus: reservation.status,
      toStatus: nextStatus,
      changedBy: user.id,
      reason: adminMemo,
    });

    refreshTrainingPages(tenant.slug);
    return ok("예약 상태가 변경되었습니다.");
  } catch (error) {
    return fail(error, "예약 상태 변경에 실패했습니다.");
  }
}
