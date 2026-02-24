"use server";

import { revalidatePath } from "next/cache";

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
  warmup: {
    type: "running";
    paces: string[];
  };
  mainSet: {
    type: "running";
    distance: string;
    pace: string;
    repetitions: number;
  };
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
  const repetitions = Number(formData.get("mainSetRepetitions"));
  const warmupPaces = String(formData.get("warmupPaces") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    programId: String(formData.get("programId") ?? "").trim(),
    sessionDate: String(formData.get("sessionDate") ?? "").trim(),
    week,
    dayLabel: String(formData.get("dayLabel") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    warmup: {
      type: "running",
      paces: warmupPaces,
    },
    mainSet: {
      type: "running",
      distance: String(formData.get("mainSetDistance") ?? "").trim(),
      pace: String(formData.get("mainSetPace") ?? "").trim(),
      repetitions,
    },
  };
}

function validateSessionPayload(payload: SessionPayload) {
  if (!payload.programId || !payload.sessionDate || !payload.dayLabel || !payload.title) {
    throw new Error("세션 필수 항목을 모두 입력해 주세요.");
  }

  if (!Number.isFinite(payload.week) || payload.week <= 0) {
    throw new Error("주차는 1 이상의 숫자여야 합니다.");
  }

  if (!payload.warmup.paces.length) {
    throw new Error("워밍업 페이스를 1개 이상 입력해 주세요.");
  }

  if (!payload.mainSet.distance || !payload.mainSet.pace) {
    throw new Error("메인 세트 거리와 페이스를 입력해 주세요.");
  }

  if (!Number.isFinite(payload.mainSet.repetitions) || payload.mainSet.repetitions <= 0) {
    throw new Error("반복 횟수는 1 이상의 숫자여야 합니다.");
  }
}

function refreshTrainingPages() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/program");
  revalidatePath("/admin/content");
  revalidatePath("/admin/training");
  revalidatePath("/admin/sessions");
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
        motivation: String(formData.get("motivation") ?? "").trim(),
        assist_meaning: String(formData.get("assistMeaning") ?? "").trim(),
        goal: String(formData.get("goal") ?? "").trim(),
        identity: String(formData.get("identity") ?? "").trim(),
        mindset_title: String(formData.get("mindsetTitle") ?? "").trim(),
        mindset_statement: String(formData.get("mindsetStatement") ?? "").trim(),
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

export async function createProgramContentAction(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase } = await ensureAdmin();

    const programId = String(formData.get("programId") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));
    const content = String(formData.get("content") ?? "").trim();

    if (!programId || !type || !content || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "콘텐츠 생성 필수값이 부족합니다." };
    }

    const { error } = await supabase.from("program_content").insert({
      program_id: programId,
      type,
      order_index: orderIndex,
      content,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

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
    const orderIndex = Number(formData.get("orderIndex"));
    const content = String(formData.get("content") ?? "").trim();

    if (!id || !content || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "콘텐츠 수정 필수값이 부족합니다." };
    }

    const { error } = await supabase
      .from("program_content")
      .update({ order_index: orderIndex, content })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

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
    if (!id) {
      return { ok: false, message: "삭제할 콘텐츠 ID가 없습니다." };
    }

    const { error } = await supabase.from("program_content").delete().eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

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

    const { error } = await supabase.from("training_program_sections").insert({
      program_id: programId,
      title,
      order_index: orderIndex,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

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
    const title = String(formData.get("title") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));

    if (!id || !title || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "섹션 수정 필수값이 부족합니다." };
    }

    const { error } = await supabase
      .from("training_program_sections")
      .update({ title, order_index: orderIndex })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

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
    if (!id) {
      return { ok: false, message: "삭제할 섹션 ID가 없습니다." };
    }

    const { error } = await supabase.from("training_program_sections").delete().eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

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
    const detail = String(formData.get("detail") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));

    if (!sectionId || !detail || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "디테일 생성 필수값이 부족합니다." };
    }

    const { error } = await supabase.from("training_program_section_details").insert({
      section_id: sectionId,
      detail,
      order_index: orderIndex,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

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
    const detail = String(formData.get("detail") ?? "").trim();
    const orderIndex = Number(formData.get("orderIndex"));

    if (!id || !detail || !Number.isFinite(orderIndex)) {
      return { ok: false, message: "디테일 수정 필수값이 부족합니다." };
    }

    const { error } = await supabase
      .from("training_program_section_details")
      .update({ detail, order_index: orderIndex })
      .eq("id", id);

    if (error) {
      return { ok: false, message: error.message };
    }

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
    if (!id) {
      return { ok: false, message: "삭제할 디테일 ID가 없습니다." };
    }

    const { error } = await supabase.from("training_program_section_details").delete().eq("id", id);
    if (error) {
      return { ok: false, message: error.message };
    }

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

    const { error } = await supabase.from("sessions").insert({
      program_id: payload.programId,
      session_date: payload.sessionDate,
      week: payload.week,
      day_label: payload.dayLabel,
      title: payload.title,
      warmup: payload.warmup,
      main_set: payload.mainSet,
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

    const { error } = await supabase
      .from("sessions")
      .update({
        program_id: payload.programId,
        session_date: payload.sessionDate,
        week: payload.week,
        day_label: payload.dayLabel,
        title: payload.title,
        warmup: payload.warmup,
        main_set: payload.mainSet,
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
