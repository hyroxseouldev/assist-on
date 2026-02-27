"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignupActionState = {
  error: string | null;
  success: string | null;
};

export async function signupAction(
  _prevState: SignupActionState,
  formData: FormData
): Promise<SignupActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

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
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    return { error: "회원가입에 실패했습니다. 입력 정보를 확인해 주세요.", success: null };
  }

  if (data.session) {
    redirect("/t/select");
  }

  return {
    error: null,
    success: "회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요.",
  };
}
