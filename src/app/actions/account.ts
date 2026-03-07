"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type AccountActionResult = {
  ok: boolean;
  message: string;
};

export async function updateMyAccountFullNameAction(fullName: string): Promise<AccountActionResult> {
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

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");

  return { ok: true, message: "이름이 업데이트되었습니다." };
}

export async function deactivateMyAccountAction(confirmText: string): Promise<AccountActionResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "로그인이 필요합니다." };
  }

  if (confirmText.trim() !== "삭제합니다") {
    return { ok: false, message: "확인 문구가 일치하지 않습니다." };
  }

  const deactivatedAt = new Date().toISOString();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ account_status: "deactivated", deactivated_at: deactivatedAt })
    .eq("id", user.id);

  if (profileError) {
    return { ok: false, message: profileError.message };
  }

  await supabase
    .from("user_subscriptions")
    .update({ cancel_at_period_end: true, canceled_at: deactivatedAt })
    .eq("user_id", user.id)
    .in("status", ["active", "past_due", "incomplete"])
    .eq("cancel_at_period_end", false);

  await supabase.auth.signOut();

  revalidatePath("/mypage");
  revalidatePath("/mypage/subscriptions");
  revalidatePath("/mypage/profile");
  revalidatePath("/mypage/active-programs");

  return { ok: true, message: "계정이 비활성화되었습니다." };
}
