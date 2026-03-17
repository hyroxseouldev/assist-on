"use server";

import { redirect } from "next/navigation";

import { getDefaultSignedInPath, isSafeInternalPath, normalizeTenantMemberships, type TenantMembershipRow } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserLoginActionState = {
  error: string | null;
};

export async function userLoginAction(
  _prevState: UserLoginActionState,
  formData: FormData
): Promise<UserLoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "이메일 인증이 필요합니다. 받은 편지함의 인증 링크를 먼저 확인해 주세요." };
    }

    return { error: "로그인에 실패했습니다. 입력 정보를 확인해 주세요." };
  }

  if (isSafeInternalPath(nextPath)) {
    redirect(nextPath);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/mypage");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle<{ account_status: "active" | "deactivated" | null }>();

  if (profile?.account_status === "deactivated") {
    await supabase.auth.signOut();
    return { error: "비활성화된 계정입니다. 관리자에게 문의해 주세요." };
  }

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("tenant_id, role, tenants:tenant_id(slug)")
    .eq("user_id", user.id)
    .returns<TenantMembershipRow[]>();

  redirect(getDefaultSignedInPath(normalizeTenantMemberships(memberships)));
}
