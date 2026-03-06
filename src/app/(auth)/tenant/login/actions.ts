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

export type LoginActionState = {
  error: string | null;
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextPath = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 모두 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "로그인에 실패했습니다. 입력 정보를 확인해 주세요." };
  }

  if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    redirect(nextPath);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/t/select");
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
    redirect(isAdminRole ? `/t/${slug}/admin` : "/mypage/subscriptions");
  }

  const hasAdminTenant = tenantMemberships.some((membership) => membership.role === "owner" || membership.role === "coach");
  if (!hasAdminTenant) {
    redirect("/mypage/subscriptions");
  }

  redirect("/t/select");
}
