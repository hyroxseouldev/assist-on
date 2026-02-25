"use server";

import { revalidatePath } from "next/cache";

import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = {
  ok: boolean;
  message: string;
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

async function ensureAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("로그인이 필요합니다.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: "user" | "admin" }>();

  if (profileError || profile?.role !== "admin") {
    throw new Error("관리자 권한이 필요합니다.");
  }

  return { supabase };
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

function refreshTrainingPages() {
  revalidatePath("/");
  revalidatePath("/notices");
  revalidatePath("/about");
  revalidatePath("/admin");
  revalidatePath("/admin/program");
  revalidatePath("/admin/about");
  revalidatePath("/admin/sessions");
  revalidatePath("/admin/notices");
}

export async function updateProgramInfoAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

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

    const { error } = await supabase.from("programs").update(patch).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("프로그램 정보가 저장되었습니다.");
  } catch (error) {
    return fail(error, "프로그램 정보 저장에 실패했습니다.");
  }
}

export async function updateAboutContentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

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

    const { error } = await supabase.from("about_content").update(patch).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("About 콘텐츠가 저장되었습니다.");
  } catch (error) {
    return fail(error, "About 콘텐츠 저장에 실패했습니다.");
  }
}

export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const payload = parseSessionPayload(formData);
    validateSessionPayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "세션 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase.from("sessions").insert({
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

    refreshTrainingPages();
    return ok("세션이 추가되었습니다.");
  } catch (error) {
    return fail(error, "세션 추가에 실패했습니다.");
  }
}

export async function updateSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

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
        program_id: payload.programId,
        session_date: payload.sessionDate,
        week: payload.week,
        day_label: payload.dayLabel,
        title: payload.title,
        content_html: sanitizedHtml,
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("세션이 수정되었습니다.");
  } catch (error) {
    return fail(error, "세션 수정에 실패했습니다.");
  }
}

export async function deleteSessionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "삭제할 세션 ID가 없습니다." };
    }

    const { error } = await supabase.from("sessions").delete().eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("세션이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "세션 삭제에 실패했습니다.");
  }
}

export async function createNoticeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();
    const payload = parseNoticePayload(formData);
    validateNoticePayload(payload);
    const sanitizedHtml = sanitizeSessionContent(payload.contentHtml);

    if (!sanitizedHtml || sanitizedHtml === "<p></p>") {
      return { ok: false, message: "공지 본문 내용을 입력해 주세요." };
    }

    const { error } = await supabase.from("notices").insert({
      title: payload.title,
      content_html: sanitizedHtml,
      is_published: payload.isPublished,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("공지사항이 등록되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 등록에 실패했습니다.");
  }
}

export async function updateNoticeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();
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
        title: payload.title,
        content_html: sanitizedHtml,
        is_published: payload.isPublished,
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("공지사항이 수정되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 수정에 실패했습니다.");
  }
}

export async function deleteNoticeAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "삭제할 공지 ID가 없습니다." };
    }

    const { error } = await supabase.from("notices").delete().eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("공지사항이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 삭제에 실패했습니다.");
  }
}

export async function toggleNoticePublishedAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();
    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "대상 공지 ID가 없습니다." };
    }

    const nextPublished = String(formData.get("nextPublished") ?? "false") === "true";

    const { error } = await supabase.from("notices").update({ is_published: nextPublished }).eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok(nextPublished ? "공지사항이 공개되었습니다." : "공지사항이 비공개되었습니다.");
  } catch (error) {
    return fail(error, "공지사항 상태 변경에 실패했습니다.");
  }
}
