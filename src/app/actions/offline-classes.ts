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

export async function applyOfflineClassAction(classId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const tenant = await getTenantBySlug(supabase);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !tenant) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data: targetClass } = await supabase
      .from("offline_classes")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", classId)
      .maybeSingle<{ id: string }>();

    if (!targetClass) {
      return { ok: false, message: "해당 테넌트에서 클래스를 찾지 못했습니다." };
    }

    const { error } = await supabase.rpc("register_offline_class", { p_class_id: classId });
    if (error) {
      return { ok: false, message: error.message };
    }

    refreshOfflineClassPages(tenant.slug);
    return ok("오프라인 클래스 신청이 완료되었습니다.");
  } catch (error) {
    return fail(error, "오프라인 클래스 신청에 실패했습니다.");
  }
}

export async function cancelOfflineClassAction(classId: string): Promise<ActionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const tenant = await getTenantBySlug(supabase);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !tenant) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const { data: targetClass } = await supabase
      .from("offline_classes")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("id", classId)
      .maybeSingle<{ id: string }>();

    if (!targetClass) {
      return { ok: false, message: "해당 테넌트에서 클래스를 찾지 못했습니다." };
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
