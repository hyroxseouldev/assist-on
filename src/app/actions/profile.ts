"use server";

import { revalidatePath } from "next/cache";

import { isProfileGender, type ProfileGender } from "@/lib/profile/gender";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ensureTenantUserProfile, getTenantBySlug } from "@/lib/tenant/server";

async function ensureProfileContext(tenantSlug: string) {
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

  return {
    supabase,
    user,
    tenant,
  };
}

function refreshAdminProfilePath(tenantSlug: string) {
  revalidatePath("/admin/profile");
  revalidatePath(`/t/${tenantSlug}/admin/profile`);
}

export async function updateMyFullNameAction(tenantSlug: string, fullName: string) {
  const { supabase, user, tenant } = await ensureProfileContext(tenantSlug);

  const trimmed = fullName.trim();
  if (!trimmed) {
    return { ok: false, message: "이름을 입력해 주세요." };
  }

  await ensureTenantUserProfile(supabase, tenant.id, user);

  const { error } = await supabase
    .from("tenant_user_profiles")
    .update({ display_name: trimmed })
    .eq("tenant_id", tenant.id)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  refreshAdminProfilePath(tenant.slug);

  return { ok: true, message: "이름이 업데이트되었습니다." };
}

export async function updateMyGenderAction(tenantSlug: string, gender: ProfileGender | null) {
  const { supabase, user, tenant } = await ensureProfileContext(tenantSlug);

  if (gender !== null && !isProfileGender(gender)) {
    return { ok: false, message: "유효한 성별을 선택해 주세요." };
  }

  const { error } = await supabase.from("profiles").update({ gender }).eq("id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  refreshAdminProfilePath(tenant.slug);

  return { ok: true, message: "성별이 업데이트되었습니다." };
}
