"use server";

import { redirect } from "next/navigation";

import { getDefaultSignedInPath, normalizeTenantMemberships, type TenantMembershipRow } from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "로그인에 실패했습니다. 입력 정보를 확인해 주세요." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인 세션을 확인하지 못했습니다. 다시 시도해 주세요." };
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

  const adminPath = getDefaultSignedInPath(normalizeTenantMemberships(memberships));

  if (!adminPath) {
    await supabase.auth.signOut();
    return { error: "관리자 또는 코치 권한이 있는 계정만 로그인할 수 있습니다." };
  }

  redirect("/admin");
}
