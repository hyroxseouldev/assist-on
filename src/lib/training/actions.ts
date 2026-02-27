"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export type ProgramSwitchResult = {
  ok: boolean;
  message: string;
};

export async function setActiveProgramAction(formData: FormData): Promise<ProgramSwitchResult> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "").trim();
  const programId = String(formData.get("programId") ?? "").trim();

  if (!tenantSlug || !programId) {
    return { ok: false, message: "프로그램 선택값이 올바르지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    return { ok: false, message: "테넌트를 찾을 수 없습니다." };
  }

  const { data: program } = await supabase
    .from("programs")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("id", programId)
    .maybeSingle<{ id: string }>();

  if (!program) {
    return { ok: false, message: "선택한 프로그램이 존재하지 않습니다." };
  }

  const nowIso = new Date().toISOString();
  const { data: entitlementRows } = await supabase
    .from("program_entitlements")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .eq("program_id", programId)
    .eq("is_active", true)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .limit(1)
    .returns<Array<{ id: string }>>();

  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("user_id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();

  if (!membership && (entitlementRows ?? []).length === 0) {
    return { ok: false, message: "해당 프로그램 접근 권한이 없습니다." };
  }

  const { error } = await supabase.from("user_program_states").upsert(
    {
      tenant_id: tenant.id,
      user_id: user.id,
      active_program_id: programId,
    },
    { onConflict: "tenant_id,user_id" }
  );

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath(`/t/${tenantSlug}`);
  return { ok: true, message: "활성 프로그램이 변경되었습니다." };
}
