"use server";

import { redirect } from "next/navigation";

import { appUrl } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserSignupActionState = {
  error: string | null;
  success: string | null;
};

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

export async function userSignupAction(
  _prevState: UserSignupActionState,
  formData: FormData
): Promise<UserSignupActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim();

  if (!name || !email || !password) {
    return { error: "이름, 이메일, 비밀번호를 모두 입력해 주세요.", success: null };
  }

  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상으로 입력해 주세요.", success: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/confirm?next=${encodeURIComponent(isSafeInternalPath(nextPath) ? nextPath : "/t/select")}`,
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    return { error: "가입에 실패했습니다. 입력 정보를 확인해 주세요.", success: null };
  }

  if (data.session) {
    if (isSafeInternalPath(nextPath)) {
      redirect(nextPath);
    }
    redirect("/t/select");
  }

  return {
    error: null,
    success: "가입이 완료되었습니다. 이메일 인증 링크를 확인한 뒤 다시 돌아오면 초대 수락을 이어서 진행할 수 있습니다.",
  };
}
