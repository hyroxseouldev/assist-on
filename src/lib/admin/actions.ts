"use server";

import { createHash, randomBytes } from "crypto";

import { revalidatePath } from "next/cache";

import type { CommunityPostStatus, CommunityReportStatus, ProgramDifficulty } from "@/lib/admin/types";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { appUrl, createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageTenantContent,
  canManageTenantMembers,
  getTenantBySlug,
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
  week: number;
  dayLabel: string;
  title: string;
  contentHtml: string;
};

type NoticePayload = {
  title: string;
  contentHtml: string;
  isPublished: boolean;
};

type OfflineClassPayload = {
  title: string;
  contentHtml: string;
  locationText: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  isPublished: boolean;
};

type InvitePayload = {
  role: "coach" | "member";
  programId: string;
  expiresHours: number;
  maxUses: number;
};

type GrantByEmailPayload = {
  email: string;
  role: "coach" | "member";
  programId: string;
};

type InvitationActionResult = ActionResult & {
  invitationLink?: string;
};

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const tenant = await getTenantBySlug(supabase);
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

function parseLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseTrainingProgramText(value: FormDataEntryValue | null) {
  const lines = String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sections: { title: string; details: string[] }[] = [];
  let current: { title: string; details: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith("# ")) {
      current = { title: line.slice(2).trim(), details: [] };
      if (current.title) {
        sections.push(current);
      }
      continue;
    }

    if (line.startsWith("- ")) {
      if (!current) continue;

      const detail = line.slice(2).trim();
      if (detail) {
        current.details.push(detail);
      }
      continue;
    }

    if (!current) {
      current = { title: line, details: [] };
      sections.push(current);
      continue;
    }

    current.details.push(line);
  }

  return sections;
}

function parseProgramDifficulty(raw: FormDataEntryValue | null): ProgramDifficulty {
  const value = String(raw ?? "intermediate").trim() as ProgramDifficulty;
  if (value === "beginner" || value === "intermediate" || value === "advanced") {
    return value;
  }
  return "intermediate";
}

function parseIntegerField(raw: FormDataEntryValue | null, fallback: number) {
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.floor(value);
}

function parseSessionPayload(formData: FormData): SessionPayload {
  const week = Number(formData.get("week"));
  const contentHtml = String(formData.get("contentHtml") ?? "").trim();

  return {
    programId: String(formData.get("programId") ?? "").trim(),
    sessionDate: String(formData.get("sessionDate") ?? "").trim(),
    week,
    dayLabel: String(formData.get("dayLabel") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    contentHtml,
  };
}

function parseNoticePayload(formData: FormData): NoticePayload {
  const title = String(formData.get("title") ?? "").trim();
  const contentHtml = String(formData.get("contentHtml") ?? "").trim();
  const isPublished = String(formData.get("isPublished") ?? "") === "true";

  return {
    title,
    contentHtml,
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
  const locationText = String(formData.get("locationText") ?? "").trim();
  const startsAt = parseDateTimeInKst(formData.get("startsAt"));
  const endsAt = parseDateTimeInKst(formData.get("endsAt"));
  const capacity = Number(formData.get("capacity"));
  const isPublished = String(formData.get("isPublished") ?? "") === "true";

  return {
    title,
    contentHtml,
    locationText,
    startsAt,
    endsAt,
    capacity,
    isPublished,
  };
}

function parseInvitePayload(formData: FormData): InvitePayload {
  const expiresHoursRaw = Number(formData.get("expiresHours"));
  const maxUsesRaw = Number(formData.get("maxUses"));

  return {
    role: String(formData.get("role") ?? "member").trim() as InvitePayload["role"],
    programId: String(formData.get("programId") ?? "").trim(),
    expiresHours: Number.isFinite(expiresHoursRaw) ? Math.floor(expiresHoursRaw) : 72,
    maxUses: Number.isFinite(maxUsesRaw) ? Math.floor(maxUsesRaw) : 1,
  };
}

function validateSessionPayload(payload: SessionPayload) {
  if (!payload.programId || !payload.sessionDate || !payload.dayLabel || !payload.title) {
    throw new Error("세션 필수 항목을 모두 입력해 주세요.");
  }

  if (!payload.contentHtml) {
    throw new Error("세션 본문을 입력해 주세요.");
  }

  if (!Number.isFinite(payload.week) || payload.week <= 0) {
    throw new Error("주차는 1 이상의 숫자여야 합니다.");
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

function validateInvitePayload(payload: InvitePayload) {
  if (!["coach", "member"].includes(payload.role)) {
    throw new Error("유효한 초대 권한을 선택해 주세요.");
  }

  if (!payload.programId) {
    throw new Error("초대할 프로그램을 선택해 주세요.");
  }

  if (!Number.isFinite(payload.expiresHours) || payload.expiresHours < 1 || payload.expiresHours > 720) {
    throw new Error("만료 시간은 1~720시간 사이로 설정해 주세요.");
  }

  if (!Number.isFinite(payload.maxUses) || payload.maxUses < 1 || payload.maxUses > 100) {
    throw new Error("사용 가능 횟수는 1~100회 사이로 설정해 주세요.");
  }
}

function parseGrantByEmailPayload(formData: FormData): GrantByEmailPayload {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: String(formData.get("role") ?? "member").trim() as GrantByEmailPayload["role"],
    programId: String(formData.get("programId") ?? "").trim(),
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

function rolePriority(role: "owner" | "coach" | "member") {
  if (role === "owner") return 3;
  if (role === "coach") return 2;
  return 1;
}

function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createInvitationToken() {
  return randomBytes(24).toString("base64url");
}

function refreshTrainingPages(tenantSlug: string) {
  revalidatePath("/");
  revalidatePath("/t/select");
  revalidatePath(`/t/${tenantSlug}`);
  revalidatePath(`/t/${tenantSlug}/community`);
  revalidatePath(`/t/${tenantSlug}/notices`);
  revalidatePath(`/t/${tenantSlug}/offline-classes`);
  revalidatePath(`/t/${tenantSlug}/about`);
  revalidatePath(`/t/${tenantSlug}/admin`);
  revalidatePath(`/t/${tenantSlug}/admin/branding`);
  revalidatePath(`/t/${tenantSlug}/admin/program`);
  revalidatePath(`/t/${tenantSlug}/admin/program/new`);
  revalidatePath(`/t/${tenantSlug}/admin/store/products`);
  revalidatePath(`/t/${tenantSlug}/admin/about`);
  revalidatePath(`/t/${tenantSlug}/admin/sessions`);
  revalidatePath(`/t/${tenantSlug}/admin/notices`);
  revalidatePath(`/t/${tenantSlug}/admin/offline-classes`);
  revalidatePath(`/t/${tenantSlug}/admin/community`);
  revalidatePath(`/t/${tenantSlug}/admin/invitations`);
  revalidatePath(`/t/${tenantSlug}/admin/users`);
  revalidatePath("/tenant/login");
  revalidatePath("/reset-password");
  revalidatePath("/update-password");
}

function refreshUserAdminPages(tenantSlug: string) {
  revalidatePath(`/t/${tenantSlug}/admin/invitations`);
  revalidatePath(`/t/${tenantSlug}/admin/users`);
}

export async function updateProgramLogoAction(programId: string, logoUrl: string): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin();
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
    const { supabase, tenant } = await ensureAdmin();

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
    const { supabase, tenant } = await ensureAdmin();

    const patch = {
      team_name: String(formData.get("teamName") ?? "").trim(),
      logo_url: String(formData.get("logoUrl") ?? "").trim(),
      slogan: String(formData.get("slogan") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      coach_name: String(formData.get("coachName") ?? "").trim(),
      coach_instagram: String(formData.get("coachInstagram") ?? "").trim(),
      coach_career: parseLines(formData.get("coachCareer")),
    };

    if (!patch.team_name) {
      return { ok: false, message: "팀 이름을 입력해 주세요." };
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

export async function createTenantProgramAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin();
    const adminSupabase = createSupabaseAdminClient();

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
    const difficulty = parseProgramDifficulty(formData.get("difficulty"));
    const dailyWorkoutMinutes = parseIntegerField(formData.get("dailyWorkoutMinutes"), 60);
    const daysPerWeek = parseIntegerField(formData.get("daysPerWeek"), 5);
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
      motivation: "",
      assist_meaning: "",
      goal: "",
      identity: "",
      mindset_title: "",
      mindset_statement: "",
      start_date: startDate,
      end_date: endDate,
      thumbnail_url: thumbnailUrl,
      difficulty,
      daily_workout_minutes: dailyWorkoutMinutes,
      days_per_week: daysPerWeek,
      })
      .select("id")
      .single<{ id: string }>();

    if (error) {
      return { ok: false, message: error.message };
    }

    const { error: productError } = await adminSupabase.from("program_products").insert({
      tenant_id: tenant.id,
      program_id: data.id,
      price_krw: 99000,
      is_active: false,
    });

    if (productError) {
      return {
        ok: false,
        message: `프로그램은 생성되었지만 스토어 상품 자동 생성에 실패했습니다: ${productError.message}`,
      };
    }

    refreshTrainingPages(tenant.slug);
    return { ok: true, message: "프로그램이 생성되었습니다.", programId: data.id };
  } catch (error) {
    return fail(error, "프로그램 생성에 실패했습니다.");
  }
}

export async function updateTenantProgramAction(formData: FormData): Promise<ActionResult> {
  try {
    const { tenant } = await ensureAdmin();
    const adminSupabase = createSupabaseAdminClient();

    const id = String(formData.get("id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const thumbnailUrl = String(formData.get("thumbnailUrl") ?? "").trim();
    const difficulty = parseProgramDifficulty(formData.get("difficulty"));
    const dailyWorkoutMinutes = parseIntegerField(formData.get("dailyWorkoutMinutes"), 60);
    const daysPerWeek = parseIntegerField(formData.get("daysPerWeek"), 5);
    const startDate = String(formData.get("startDate") ?? "").trim();
    const endDate = String(formData.get("endDate") ?? "").trim();

    if (!id || !title || !startDate || !endDate) {
      return { ok: false, message: "프로그램명, 시작일, 종료일은 필수입니다." };
    }

    if (dailyWorkoutMinutes < 10 || dailyWorkoutMinutes > 300) {
      return { ok: false, message: "하루 운동 시간은 10~300분 사이여야 합니다." };
    }

    if (daysPerWeek < 1 || daysPerWeek > 7) {
      return { ok: false, message: "주당 운동일은 1~7일 사이여야 합니다." };
    }

    const { error } = await adminSupabase
      .from("programs")
      .update({
        title,
        team_name: title,
        slogan: title,
        description,
        thumbnail_url: thumbnailUrl,
        difficulty,
        daily_workout_minutes: dailyWorkoutMinutes,
        days_per_week: daysPerWeek,
        start_date: startDate,
        end_date: endDate,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
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
    const { tenant } = await ensureAdmin();
    const adminSupabase = createSupabaseAdminClient();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "프로그램 ID가 없습니다." };
    }

    const { count: sessionsCount } = await adminSupabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("program_id", id);

    if ((sessionsCount ?? 0) > 0) {
      return { ok: false, message: "세션이 등록된 프로그램은 삭제할 수 없습니다. 세션을 먼저 정리해 주세요." };
    }

    const { data: products } = await adminSupabase
      .from("program_products")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("program_id", id)
      .returns<Array<{ id: string }>>();

    const productIds = (products ?? []).map((row) => row.id);

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

export async function updateProgramProductAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const price = Number(formData.get("priceKrw"));
    const isActive = String(formData.get("isActive") ?? "false") === "true";
    const thumbnailUrlsRaw = String(formData.get("thumbnailUrls") ?? "[]");
    const contentHtmlRaw = String(formData.get("contentHtml") ?? "");

    if (!id || !Number.isFinite(price) || price <= 0) {
      return { ok: false, message: "유효한 가격을 입력해 주세요." };
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

    const { error } = await supabase
      .from("program_products")
      .update({
        price_krw: Math.floor(price),
        is_active: isActive,
        thumbnail_urls: thumbnailUrls,
        content_html: contentHtml,
      })
      .eq("tenant_id", tenant.id)
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("상품 설정이 저장되었습니다.");
  } catch (error) {
    return fail(error, "상품 설정 저장에 실패했습니다.");
  }
}

export async function updateAboutContentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "about 콘텐츠 ID가 없습니다." };
    }

    const patch = {
      motivation: String(formData.get("motivation") ?? "").trim(),
      assist_meaning: String(formData.get("assistMeaning") ?? "").trim(),
      goal: String(formData.get("goal") ?? "").trim(),
      identity: String(formData.get("identity") ?? "").trim(),
      mindset_title: String(formData.get("mindsetTitle") ?? "").trim(),
      mindset_statement: String(formData.get("mindsetStatement") ?? "").trim(),
      core_messages: parseLines(formData.get("coreMessages")),
      philosophy_values: parseLines(formData.get("philosophyValues")),
      benefits: parseLines(formData.get("benefits")),
      training_program: parseTrainingProgramText(formData.get("trainingProgramText")),
    };

    const { error } = await supabase.from("about_content").update(patch).eq("tenant_id", tenant.id).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages(tenant.slug);
    return ok("About 콘텐츠가 저장되었습니다.");
  } catch (error) {
    return fail(error, "About 콘텐츠 저장에 실패했습니다.");
  }
}

export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin();

    const payload = parseSessionPayload(formData);
    validateSessionPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "세션 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase.from("sessions").insert({
      tenant_id: tenant.id,
      program_id: payload.programId,
      session_date: payload.sessionDate,
      week: payload.week,
      day_label: payload.dayLabel,
      title: payload.title,
      content_html: sanitizedHtml,
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
    const { supabase, tenant } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "수정할 세션 ID가 없습니다." };
    }

    const payload = parseSessionPayload(formData);
    validateSessionPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "세션 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase
      .from("sessions")
      .update({
        tenant_id: tenant.id,
        program_id: payload.programId,
        session_date: payload.sessionDate,
        week: payload.week,
        day_label: payload.dayLabel,
        title: payload.title,
        content_html: sanitizedHtml,
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
    const { supabase, tenant } = await ensureAdmin();

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
    const { supabase, tenant } = await ensureAdmin();
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
    const { supabase, tenant } = await ensureAdmin();
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
    const { supabase, tenant } = await ensureAdmin();
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
    const { supabase, tenant } = await ensureAdmin();
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
    const { supabase, tenant } = await ensureAdmin();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const payload = parseOfflineClassPayload(formData);
    validateOfflineClassPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "클래스 설명 본문을 입력해 주세요." };
    }

    const { error } = await supabase.from("offline_classes").insert({
      tenant_id: tenant.id,
      title: payload.title,
      content_html: sanitizedHtml,
      location_text: payload.locationText,
      starts_at: payload.startsAt,
      ends_at: payload.endsAt,
      capacity: payload.capacity,
      is_published: payload.isPublished,
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
    const { supabase, tenant } = await ensureAdmin();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "수정할 클래스 ID가 없습니다." };
    }

    const payload = parseOfflineClassPayload(formData);
    validateOfflineClassPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

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
        location_text: payload.locationText,
        starts_at: payload.startsAt,
        ends_at: payload.endsAt,
        capacity: payload.capacity,
        is_published: payload.isPublished,
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
    const { supabase, tenant } = await ensureAdmin();
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
    const { supabase, tenant } = await ensureAdmin();
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

export async function createInvitationLinkAction(formData: FormData): Promise<InvitationActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin();

    if (!canManageMembers) {
      return { ok: false, message: "멤버 초대는 owner 권한이 필요합니다." };
    }

    const payload = parseInvitePayload(formData);
    validateInvitePayload(payload);

    const { data: program } = await supabase
      .from("programs")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", payload.programId)
      .maybeSingle<{ id: string }>();

    if (!program) {
      return { ok: false, message: "초대 대상 프로그램을 찾지 못했습니다." };
    }

    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);
    const expiresAt = new Date(Date.now() + payload.expiresHours * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("tenant_invitations").insert({
      tenant_id: tenant.id,
      role: payload.role,
      program_id: payload.programId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      max_uses: payload.maxUses,
      used_count: 0,
      created_by: user.id,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshUserAdminPages(tenant.slug);
    return {
      ok: true,
      message: "초대 링크가 생성되었습니다.",
      invitationLink: `${appUrl}/invite/${token}`,
    };
  } catch (error) {
    return fail(error, "초대 링크 생성에 실패했습니다.");
  }
}

export async function deleteInvitationLinkAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, canManageMembers } = await ensureAdmin();
    const invitationId = String(formData.get("invitationId") ?? "").trim();

    if (!canManageMembers) {
      return { ok: false, message: "초대 링크 삭제는 owner 권한이 필요합니다." };
    }

    if (!invitationId) {
      return { ok: false, message: "삭제할 초대 ID가 없습니다." };
    }

    const { error } = await supabase
      .from("tenant_invitations")
      .delete()
      .eq("tenant_id", tenant.id)
      .eq("id", invitationId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshUserAdminPages(tenant.slug);
    return ok("초대 링크가 삭제되었습니다.");
  } catch (error) {
    return fail(error, "초대 링크 삭제에 실패했습니다.");
  }
}

export async function grantAccessByEmailAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin();

    if (!canManageMembers) {
      return { ok: false, message: "이메일 권한 부여는 owner 권한이 필요합니다." };
    }

    const payload = parseGrantByEmailPayload(formData);
    validateGrantByEmailPayload(payload);

    const { data: program } = await supabase
      .from("programs")
      .select("id, end_date")
      .eq("tenant_id", tenant.id)
      .eq("id", payload.programId)
      .maybeSingle<{ id: string; end_date: string }>();

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

    const nowIso = new Date().toISOString();
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
      const endsAt = program.end_date ? new Date(`${program.end_date}T23:59:59+09:00`).toISOString() : null;

      const { error: entitlementError } = await adminSupabase.from("program_entitlements").insert({
        tenant_id: tenant.id,
        user_id: targetUser.id,
        program_id: program.id,
        source_order_id: null,
        source_invitation_id: null,
        source_granted_by: user.id,
        starts_at: nowIso,
        ends_at: endsAt,
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

export async function updateUserRoleAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin();
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

    refreshUserAdminPages(tenant.slug);
    return ok("사용자 권한이 변경되었습니다.");
  } catch (error) {
    return fail(error, "사용자 권한 변경에 실패했습니다.");
  }
}

export async function removeTenantMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant, user, canManageMembers } = await ensureAdmin();
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

export async function setCommunityPostStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin();
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

export async function reviewCommunityPostReportAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, tenant } = await ensureAdmin();
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
