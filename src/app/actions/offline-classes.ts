"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

type ActionResult = {
  ok: boolean;
  message: string;
};

function ok(message: string): ActionResult {
  return { ok: true, message };
}

function fail(error: unknown, fallback: string): ActionResult {
  if (error instanceof Error) {
    return { ok: false, message: error.message || fallback };
  }
  return { ok: false, message: fallback };
}

function refreshOfflineClassPages(tenantSlug: string) {
  revalidatePath(`/t/${tenantSlug}`);
  revalidatePath(`/t/${tenantSlug}/offline-classes`);
  revalidatePath(`/t/${tenantSlug}/admin/offline-classes`);
}

export async function applyOfflineClassAction(tenantSlug: string, classId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const tenant = await getTenantBySlug(supabase, tenantSlug);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !tenant) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data: targetClass } = await supabase
      .from("offline_classes")
      .select("id, starts_at, registration_opens_at, registration_closes_at")
      .eq("tenant_id", tenant.id)
      .eq("id", classId)
      .maybeSingle<{ id: string; starts_at: string; registration_opens_at: string | null; registration_closes_at: string | null }>();

    if (!targetClass) {
      return { ok: false, message: "해당 테넌트에서 클래스를 찾지 못했습니다." };
    }

    const now = Date.now();
    if (targetClass.registration_opens_at && now < new Date(targetClass.registration_opens_at).getTime()) {
      return { ok: false, message: "아직 예약 신청이 시작되지 않았습니다." };
    }

    const registrationClosesAt = targetClass.registration_closes_at ?? targetClass.starts_at;
    if (now >= new Date(registrationClosesAt).getTime()) {
      return { ok: false, message: "예약 신청 시간이 마감되었습니다." };
    }

    const { error } = await supabase.rpc("register_offline_class", { p_class_id: classId });
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshOfflineClassPages(tenant.slug);
    return ok("오프라인 클래스 신청이 접수되었습니다. 관리자가 확인하면 참여가 확정됩니다.");
  } catch (error) {
    return fail(error, "오프라인 클래스 신청에 실패했습니다.");
  }
}

export async function cancelOfflineClassAction(tenantSlug: string, classId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const tenant = await getTenantBySlug(supabase, tenantSlug);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !tenant) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data: targetClass } = await supabase
      .from("offline_classes")
      .select("id, starts_at, cancellation_closes_at")
      .eq("tenant_id", tenant.id)
      .eq("id", classId)
      .maybeSingle<{ id: string; starts_at: string; cancellation_closes_at: string | null }>();

    if (!targetClass) {
      return { ok: false, message: "해당 테넌트에서 클래스를 찾지 못했습니다." };
    }

    const cancellationClosesAt = targetClass.cancellation_closes_at ?? targetClass.starts_at;
    if (Date.now() >= new Date(cancellationClosesAt).getTime()) {
      return { ok: false, message: "예약 취소 시간이 마감되었습니다." };
    }

    const { error } = await supabase.rpc("cancel_offline_class_registration", { p_class_id: classId });
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshOfflineClassPages(tenant.slug);
    return ok("클래스 신청이 취소되었습니다.");
  } catch (error) {
    return fail(error, "클래스 신청 취소에 실패했습니다.");
  }
}
