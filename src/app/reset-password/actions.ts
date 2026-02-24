"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ResetPasswordActionState = {
  error: string | null;
  success: string | null;
};

export async function requestPasswordResetAction(
  _prevState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "이메일을 입력해 주세요.", success: null };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/confirm?next=/update-password`,
  });

  if (error) {
    return { error: "재설정 메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.", success: null };
  }

  return {
    error: null,
    success: "비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.",
  };
}
