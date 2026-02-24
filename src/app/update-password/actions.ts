"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UpdatePasswordActionState = {
  error: string | null;
};

export async function updatePasswordAction(
  _prevState: UpdatePasswordActionState,
  formData: FormData
): Promise<UpdatePasswordActionState> {
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!password || !passwordConfirm) {
    return { error: "새 비밀번호와 확인 비밀번호를 입력해 주세요." };
  }

  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상으로 입력해 주세요." };
  }

  if (password !== passwordConfirm) {
    return { error: "비밀번호가 일치하지 않습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "인증 세션이 만료되었습니다. 비밀번호 재설정을 다시 진행해 주세요." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해 주세요." };
  }

  redirect("/");
}
