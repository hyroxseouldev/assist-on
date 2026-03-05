"use server";

import { revalidatePath } from "next/cache";

import { getTenantBySlug } from "@/lib/tenant/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PersonalRecordMetricType = "weight" | "reps" | "distance" | "duration";

type PersonalRecordRow = {
  id: string;
  exercise_name: string;
  metric_type: PersonalRecordMetricType;
  value_numeric: number | string | null;
  value_seconds: number | null;
  unit: string;
  recorded_at: string;
  memo: string;
  created_at: string;
};

type PersonalRecordActionResult = {
  ok: boolean;
  message: string;
};

function metricUnit(metricType: PersonalRecordMetricType) {
  if (metricType === "weight") return "kg";
  if (metricType === "reps") return "reps";
  if (metricType === "distance") return "km";
  return "mm:ss";
}

function parseDurationToSeconds(raw: string) {
  const trimmed = raw.trim();
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    throw new Error("시간 기록은 mm:ss 형식으로 입력해 주세요. 예: 04:35");
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const totalSeconds = minutes * 60 + seconds;

  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    throw new Error("유효한 시간 기록을 입력해 주세요.");
  }

  return totalSeconds;
}

function parseRecordPayload(formData: FormData) {
  const exerciseName = String(formData.get("exerciseName") ?? "").trim();
  const metricType = String(formData.get("metricType") ?? "").trim() as PersonalRecordMetricType;
  const valueInput = String(formData.get("value") ?? "").trim();
  const recordedAt = String(formData.get("recordedAt") ?? "").trim();
  const memo = String(formData.get("memo") ?? "").trim();

  if (!exerciseName) {
    throw new Error("운동 이름을 입력해 주세요.");
  }

  if (!recordedAt || Number.isNaN(Date.parse(recordedAt))) {
    throw new Error("기록 날짜를 올바르게 입력해 주세요.");
  }

  if (!(["weight", "reps", "distance", "duration"] as const).includes(metricType)) {
    throw new Error("유효한 기록 타입을 선택해 주세요.");
  }

  if (!valueInput) {
    throw new Error("기록 값을 입력해 주세요.");
  }

  if (metricType === "duration") {
    const valueSeconds = parseDurationToSeconds(valueInput);
    return {
      exerciseName,
      metricType,
      valueNumeric: null as number | null,
      valueSeconds,
      unit: metricUnit(metricType),
      recordedAt,
      memo,
    };
  }

  const valueNumeric = Number(valueInput);
  if (!Number.isFinite(valueNumeric) || valueNumeric <= 0) {
    throw new Error("기록 값은 0보다 큰 숫자여야 합니다.");
  }

  if (metricType === "reps" && !Number.isInteger(valueNumeric)) {
    throw new Error("반복 횟수는 정수로 입력해 주세요.");
  }

  return {
    exerciseName,
    metricType,
    valueNumeric,
    valueSeconds: null as number | null,
    unit: metricUnit(metricType),
    recordedAt,
    memo,
  };
}

async function ensureProfileContext() {
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

  return {
    supabase,
    user,
    tenant,
  };
}

function refreshProfilePath(tenantSlug: string) {
  revalidatePath(`/t/${tenantSlug}/profile`);
}

export async function getMyPersonalRecords(): Promise<PersonalRecordRow[]> {
  try {
    const { supabase, user, tenant } = await ensureProfileContext();

    const { data } = await supabase
      .from("user_personal_records")
      .select("id, exercise_name, metric_type, value_numeric, value_seconds, unit, recorded_at, memo, created_at")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<PersonalRecordRow[]>();

    return data ?? [];
  } catch {
    return [];
  }
}

export async function updateMyFullNameAction(fullName: string) {
  const { supabase, user, tenant } = await ensureProfileContext();

  const trimmed = fullName.trim();
  if (!trimmed) {
    return { ok: false, message: "이름을 입력해 주세요." };
  }

  const { error } = await supabase.from("profiles").update({ full_name: trimmed }).eq("id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  refreshProfilePath(tenant.slug);

  return { ok: true, message: "이름이 업데이트되었습니다." };
}

export async function createMyPersonalRecordAction(formData: FormData): Promise<PersonalRecordActionResult> {
  try {
    const { supabase, user, tenant } = await ensureProfileContext();
    const payload = parseRecordPayload(formData);

    const { error } = await supabase.from("user_personal_records").insert({
      tenant_id: tenant.id,
      user_id: user.id,
      exercise_name: payload.exerciseName,
      metric_type: payload.metricType,
      value_numeric: payload.valueNumeric,
      value_seconds: payload.valueSeconds,
      unit: payload.unit,
      recorded_at: payload.recordedAt,
      memo: payload.memo,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshProfilePath(tenant.slug);
    return { ok: true, message: "최고 기록이 저장되었습니다." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "기록 저장에 실패했습니다.";
    return { ok: false, message };
  }
}

export async function updateMyPersonalRecordAction(formData: FormData): Promise<PersonalRecordActionResult> {
  try {
    const { supabase, user, tenant } = await ensureProfileContext();
    const recordId = String(formData.get("recordId") ?? "").trim();

    if (!recordId) {
      return { ok: false, message: "수정할 기록 ID가 없습니다." };
    }

    const { data: existingRecord } = await supabase
      .from("user_personal_records")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .eq("id", recordId)
      .maybeSingle<{ id: string }>();

    if (!existingRecord) {
      return { ok: false, message: "기록을 찾지 못했습니다." };
    }

    const payload = parseRecordPayload(formData);
    const { error } = await supabase
      .from("user_personal_records")
      .update({
        exercise_name: payload.exerciseName,
        metric_type: payload.metricType,
        value_numeric: payload.valueNumeric,
        value_seconds: payload.valueSeconds,
        unit: payload.unit,
        recorded_at: payload.recordedAt,
        memo: payload.memo,
      })
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .eq("id", recordId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshProfilePath(tenant.slug);
    return { ok: true, message: "최고 기록이 수정되었습니다." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "기록 수정에 실패했습니다.";
    return { ok: false, message };
  }
}

export async function deleteMyPersonalRecordAction(formData: FormData): Promise<PersonalRecordActionResult> {
  try {
    const { supabase, user, tenant } = await ensureProfileContext();
    const recordId = String(formData.get("recordId") ?? "").trim();

    if (!recordId) {
      return { ok: false, message: "삭제할 기록 ID가 없습니다." };
    }

    const { error } = await supabase
      .from("user_personal_records")
      .delete()
      .eq("tenant_id", tenant.id)
      .eq("user_id", user.id)
      .eq("id", recordId);

    if (error) {
      return { ok: false, message: error.message };
    }

    refreshProfilePath(tenant.slug);
    return { ok: true, message: "최고 기록이 삭제되었습니다." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "기록 삭제에 실패했습니다.";
    return { ok: false, message };
  }
}
