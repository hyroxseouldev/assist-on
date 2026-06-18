import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthLandingShell } from "@/components/auth/auth-landing-shell";
import { LoginForm } from "@/components/auth/login-form";
import {
  getDefaultSignedInPath,
  normalizeTenantMemberships,
  type TenantMembershipRow,
} from "@/lib/auth/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "로그인 | clyrtraining",
  description: "clyrtraining 관리자 워크스페이스 로그인",
};

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase
        .from("profiles")
        .select("account_status")
        .eq("id", user.id)
        .maybeSingle<{ account_status: "active" | "deactivated" | null }>(),
      supabase
        .from("tenant_memberships")
        .select("tenant_id, role, tenants:tenant_id(slug)")
        .eq("user_id", user.id)
        .returns<TenantMembershipRow[]>(),
    ]);

    if (profile?.account_status === "deactivated") {
      await supabase.auth.signOut();
    }

    const adminPath = getDefaultSignedInPath(normalizeTenantMemberships(memberships));

    if (adminPath) {
      redirect(adminPath);
    }
  }

  return (
    <AuthLandingShell
      title="코칭 운영을 시작하세요"
      description="프로그램, 회원, 결제, 피드백을 한곳에서 관리하는 clyrtraining 관리자 워크스페이스입니다."
      brandName="clyrtraining"
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            관리자 로그인
          </h1>
          <p className="text-base leading-7 text-zinc-500">
            owner 또는 coach 권한이 있는 계정으로 로그인해 주세요.
          </p>
        </div>

        <LoginForm />
      </div>
    </AuthLandingShell>
  );
}
