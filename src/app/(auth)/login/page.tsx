import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginShell } from "@/components/auth/login-shell";
import { LoginForm } from "@/components/auth/login-form";
import {
  getDefaultSignedInPath,
  normalizeTenantMemberships,
  type TenantMembershipRow,
} from "@/lib/auth/redirects";
import { getAuthenticatedUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "로그인 | clyrtraining",
  description: "clyrtraining 관리자 워크스페이스 로그인",
};

export default async function LoginPage() {
  const { supabase, user } = await getAuthenticatedUser();

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
    <LoginShell>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            반가워요, 코치님.
          </h1>
          <p className="text-sm leading-6 text-zinc-500">
            오늘의 코칭을 시작할 시간이에요.<br />워크스페이스 계정으로 로그인해 주세요.
          </p>
        </div>

        <LoginForm />
      </div>
    </LoginShell>
  );
}
