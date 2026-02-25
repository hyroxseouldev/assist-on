"use server";

import { revalidatePath } from "next/cache";

import {
  getContentColumnByType,
  parseStringArray,
  parseTrainingProgram,
  type AboutContentRow,
} from "@/lib/about/content";
import type { ProgramContentType } from "@/lib/admin/types";
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

  return { supabase, user };
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

function refreshTrainingPages() {
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/admin");
  revalidatePath("/admin/about");
  revalidatePath("/admin/program");
  revalidatePath("/admin/content");
  revalidatePath("/admin/training");
  revalidatePath("/admin/sessions");
}

function clampIndex(index: number, max: number) {
  if (!Number.isFinite(index)) return 0;
  if (index < 0) return 0;
  if (index > max) return max;
  return index;
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
      if (!current) {
        continue;
      }

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

function parseIndexedId(rawId: string, prefix: string) {
  if (!rawId.startsWith(`${prefix}:`)) return null;
  const index = Number(rawId.slice(prefix.length + 1));
  if (!Number.isInteger(index) || index < 0) return null;
  return index;
}

function parseDetailId(rawId: string) {
  const [prefix, sectionIndexValue, detailIndexValue] = rawId.split(":");
  if (prefix !== "detail") return null;

  const sectionIndex = Number(sectionIndexValue);
  const detailIndex = Number(detailIndexValue);

  if (!Number.isInteger(sectionIndex) || !Number.isInteger(detailIndex) || sectionIndex < 0 || detailIndex < 0) {
    return null;
  }

  return { sectionIndex, detailIndex };
}

async function getAboutContentById(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, id: string) {
  const { data, error } = await supabase
    .from("about_content")
    .select("id, core_messages, philosophy_values, benefits, training_program, motivation, assist_meaning, goal, identity, mindset_title, mindset_statement")
    .eq("id", id)
    .maybeSingle<AboutContentRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("about 콘텐츠를 찾지 못했습니다.");
  }

  return data;
}

async function updateAboutContentById(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
  patch: Partial<AboutContentRow>
) {
  const { error } = await supabase.from("about_content").update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProgramAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    if (!id) {
      return { ok: false, message: "프로그램 ID가 없습니다." };
    }

    const { error } = await supabase
      .from("programs")
      .update({
        team_name: String(formData.get("teamName") ?? "").trim(),
        slogan: String(formData.get("slogan") ?? "").trim(),
        description: String(formData.get("description") ?? "").trim(),
        coach_name: String(formData.get("coachName") ?? "").trim(),
        coach_instagram: String(formData.get("coachInstagram") ?? "").trim(),
        start_date: String(formData.get("startDate") ?? "").trim(),
        end_date: String(formData.get("endDate") ?? "").trim(),
      })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshTrainingPages();
    return ok("프로그램 정보가 저장되었습니다.");
  } catch (error) {
    return fail(error, "프로그램 저장에 실패했습니다.");
  }
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
    revalidatePath("/admin/about");
    return ok("About 콘텐츠가 저장되었습니다.");
  } catch (error) {
    return fail(error, "About 콘텐츠 저장에 실패했습니다.");
  }
}

export async function createProgramContentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const programId = String(formData.get("programId") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim() as ProgramContentType;
    const orderIndex = Number(formData.get("orderIndex"));
    const content = String(formData.get("content") ?? "").trim();

    const allowedTypes: ProgramContentType[] = ["core_message", "philosophy_value", "benefit"];

    if (!programId || !allowedTypes.includes(type) || !content || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "콘텐츠 생성 필수값이 부족합니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const column = getContentColumnByType(type);
    const items = parseStringArray(about[column]);

    const next = [...items];
    const insertIndex = clampIndex(orderIndex - 1, next.length);
    next.splice(insertIndex, 0, content);

    await updateAboutContentById(supabase, about.id, { [column]: next });

    refreshTrainingPages();
    return ok("콘텐츠가 추가되었습니다.");
  } catch (error) {
    return fail(error, "콘텐츠 추가에 실패했습니다.");
  }
}

export async function updateProgramContentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const [typeValue] = id.split(":");
    const type = typeValue as ProgramContentType;
    const orderIndex = Number(formData.get("orderIndex"));
    const content = String(formData.get("content") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();

    const allowedTypes: ProgramContentType[] = ["core_message", "philosophy_value", "benefit"];

    if (!id || !content || !Number.isFinite(orderIndex) || !programId || !allowedTypes.includes(type)) {
      return { ok: false, message: "콘텐츠 수정 필수값이 부족합니다." };
    }

    const currentIndex = parseIndexedId(id, type);
    if (currentIndex === null) {
      return { ok: false, message: "콘텐츠 식별자가 올바르지 않습니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const column = getContentColumnByType(type);
    const items = parseStringArray(about[column]);

    if (currentIndex >= items.length) {
      return { ok: false, message: "수정할 콘텐츠를 찾지 못했습니다." };
    }

    const next = [...items];
    next.splice(currentIndex, 1);
    const targetIndex = clampIndex(orderIndex - 1, next.length);
    next.splice(targetIndex, 0, content);

    await updateAboutContentById(supabase, about.id, { [column]: next });

    refreshTrainingPages();
    return ok("콘텐츠가 수정되었습니다.");
  } catch (error) {
    return fail(error, "콘텐츠 수정에 실패했습니다.");
  }
}

export async function deleteProgramContentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();
    const [typeValue] = id.split(":");
    const type = typeValue as ProgramContentType;
    const allowedTypes: ProgramContentType[] = ["core_message", "philosophy_value", "benefit"];

    if (!id || !programId || !allowedTypes.includes(type)) {
      return { ok: false, message: "삭제할 콘텐츠 ID가 없습니다." };
    }

    const currentIndex = parseIndexedId(id, type);
    if (currentIndex === null) {
      return { ok: false, message: "콘텐츠 식별자가 올바르지 않습니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const column = getContentColumnByType(type);
    const items = parseStringArray(about[column]);

    if (currentIndex >= items.length) {
      return { ok: false, message: "삭제할 콘텐츠를 찾지 못했습니다." };
    }

    const next = [...items];
    next.splice(currentIndex, 1);

    await updateAboutContentById(supabase, about.id, { [column]: next });

    refreshTrainingPages();
    return ok("콘텐츠가 삭제되었습니다.");
  } catch (error) {
    return fail(error, "콘텐츠 삭제에 실패했습니다.");
  }
}

export async function createTrainingSectionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const programId = String(formData.get("programId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));

    if (!programId || !title || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "섹션 생성 필수값이 부족합니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const program = parseTrainingProgram(about.training_program);
    const next = [...program];
    const insertIndex = clampIndex(orderIndex - 1, next.length);
    next.splice(insertIndex, 0, { title, details: [] });

    await updateAboutContentById(supabase, about.id, { training_program: next });

    refreshTrainingPages();
    return ok("훈련 섹션이 추가되었습니다.");
  } catch (error) {
    return fail(error, "훈련 섹션 추가에 실패했습니다.");
  }
}

export async function updateTrainingSectionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));

    if (!id || !title || !Number.isFinite(orderIndex) || !programId) {
      return { ok: false, message: "섹션 수정 필수값이 부족합니다." };
    }

    const sectionIndex = parseIndexedId(id, "section");
    if (sectionIndex === null) {
      return { ok: false, message: "섹션 식별자가 올바르지 않습니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const program = parseTrainingProgram(about.training_program);

    if (sectionIndex >= program.length) {
      return { ok: false, message: "수정할 섹션을 찾지 못했습니다." };
    }

    const next = [...program];
    const [current] = next.splice(sectionIndex, 1);
    const targetIndex = clampIndex(orderIndex - 1, next.length);
    next.splice(targetIndex, 0, {
      title,
      details: [...current.details],
    });

    await updateAboutContentById(supabase, about.id, { training_program: next });

    refreshTrainingPages();
    return ok("훈련 섹션이 수정되었습니다.");
  } catch (error) {
    return fail(error, "훈련 섹션 수정에 실패했습니다.");
  }
}

export async function deleteTrainingSectionAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();

    if (!id || !programId) {
      return { ok: false, message: "삭제할 섹션 ID가 없습니다." };
    }

    const sectionIndex = parseIndexedId(id, "section");
    if (sectionIndex === null) {
      return { ok: false, message: "섹션 식별자가 올바르지 않습니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const program = parseTrainingProgram(about.training_program);

    if (sectionIndex >= program.length) {
      return { ok: false, message: "삭제할 섹션을 찾지 못했습니다." };
    }

    const next = [...program];
    next.splice(sectionIndex, 1);

    await updateAboutContentById(supabase, about.id, { training_program: next });

    refreshTrainingPages();
    return ok("훈련 섹션이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "훈련 섹션 삭제에 실패했습니다.");
  }
}

export async function createTrainingSectionDetailAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const sectionId = String(formData.get("sectionId") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();
    const detail = String(formData.get("detail") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));

    if (!sectionId || !programId || !detail || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "디테일 생성 필수값이 부족합니다." };
    }

    const sectionIndex = parseIndexedId(sectionId, "section");
    if (sectionIndex === null) {
      return { ok: false, message: "섹션 식별자가 올바르지 않습니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const program = parseTrainingProgram(about.training_program);

    if (sectionIndex >= program.length) {
      return { ok: false, message: "디테일을 추가할 섹션을 찾지 못했습니다." };
    }

    const next = [...program];
    const section = next[sectionIndex];
    const nextDetails = [...section.details];
    const targetIndex = clampIndex(orderIndex - 1, nextDetails.length);
    nextDetails.splice(targetIndex, 0, detail);
    next[sectionIndex] = {
      ...section,
      details: nextDetails,
    };

    await updateAboutContentById(supabase, about.id, { training_program: next });

    refreshTrainingPages();
    return ok("섹션 디테일이 추가되었습니다.");
  } catch (error) {
    return fail(error, "섹션 디테일 추가에 실패했습니다.");
  }
}

export async function updateTrainingSectionDetailAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();
    const detail = String(formData.get("detail") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));

    if (!id || !programId || !detail || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "디테일 수정 필수값이 부족합니다." };
    }

    const indexes = parseDetailId(id);
    if (!indexes) {
      return { ok: false, message: "디테일 식별자가 올바르지 않습니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const program = parseTrainingProgram(about.training_program);

    if (indexes.sectionIndex >= program.length) {
      return { ok: false, message: "수정할 디테일의 섹션을 찾지 못했습니다." };
    }

    const next = [...program];
    const section = next[indexes.sectionIndex];
    const details = [...section.details];

    if (indexes.detailIndex >= details.length) {
      return { ok: false, message: "수정할 디테일을 찾지 못했습니다." };
    }

    details.splice(indexes.detailIndex, 1);
    const targetIndex = clampIndex(orderIndex - 1, details.length);
    details.splice(targetIndex, 0, detail);

    next[indexes.sectionIndex] = {
      ...section,
      details,
    };

    await updateAboutContentById(supabase, about.id, { training_program: next });

    refreshTrainingPages();
    return ok("섹션 디테일이 수정되었습니다.");
  } catch (error) {
    return fail(error, "섹션 디테일 수정에 실패했습니다.");
  }
}

export async function deleteTrainingSectionDetailAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const id = String(formData.get("id") ?? "").trim();
    const programId = String(formData.get("programId") ?? "").trim();
    if (!id || !programId) {
      return { ok: false, message: "삭제할 디테일 ID가 없습니다." };
    }

    const indexes = parseDetailId(id);
    if (!indexes) {
      return { ok: false, message: "디테일 식별자가 올바르지 않습니다." };
    }

    const about = await getAboutContentById(supabase, programId);
    const program = parseTrainingProgram(about.training_program);

    if (indexes.sectionIndex >= program.length) {
      return { ok: false, message: "삭제할 디테일의 섹션을 찾지 못했습니다." };
    }

    const next = [...program];
    const section = next[indexes.sectionIndex];
    const details = [...section.details];

    if (indexes.detailIndex >= details.length) {
      return { ok: false, message: "삭제할 디테일을 찾지 못했습니다." };
    }

    details.splice(indexes.detailIndex, 1);
    next[indexes.sectionIndex] = {
      ...section,
      details,
    };

    await updateAboutContentById(supabase, about.id, { training_program: next });

    refreshTrainingPages();
    return ok("섹션 디테일이 삭제되었습니다.");
  } catch (error) {
    return fail(error, "섹션 디테일 삭제에 실패했습니다.");
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
