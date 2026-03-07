"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type TenantMembershipRow = {
  tenant_id: string;
  role: "owner" | "coach" | "member";
  tenants: {
    slug: string;
  } | null;
};

export type UserLoginActionState = {
  error: string | null;
};

function isSafeInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

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
    redirect("/t/select");
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

  const tenantMemberships = (memberships ?? [])
    .map((membership) => {
      const slug = membership.tenants?.slug;
      if (!slug) {
        return null;
      }

      return {
        slug,
        role: membership.role,
      };
    })
    .filter((membership): membership is { slug: string; role: TenantMembershipRow["role"] } => Boolean(membership));

  if (tenantMemberships.length === 1) {
    const [{ slug, role }] = tenantMemberships;
    const isAdminRole = role === "owner" || role === "coach";
    redirect(isAdminRole ? `/t/${slug}/admin` : "/mypage");
  }

  const hasAdminTenant = tenantMemberships.some((membership) => membership.role === "owner" || membership.role === "coach");
  if (!hasAdminTenant) {
    redirect("/mypage");
  }

  redirect("/t/select");
}
