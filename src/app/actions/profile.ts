"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updateMyFullNameAction(fullName: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  const trimmed = fullName.trim();
  if (!trimmed) {
    return { ok: false, message: "이름을 입력해 주세요." };
  }

  const { error } = await supabase.from("profiles").update({ full_name: trimmed }).eq("id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "이름이 업데이트되었습니다." };
}
