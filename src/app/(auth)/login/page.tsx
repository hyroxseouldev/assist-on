import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserAuthPanel } from "@/components/auth/user-auth-panel";
import { UserLoginForm } from "@/components/auth/user-login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getPrimaryProgramBranding } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TenantMembershipRow = {
  tenant_id: string;
  role: "owner" | "coach" | "member";
  tenants: {
    slug: string;
  } | null;
};

export const metadata: Metadata = {
  title: "로그인 | Assist On",
  description: "Assist On 사용자 로그인",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;
  const showDeactivatedMessage = error === "deactivated";

  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBranding()]);
  const user = userRes.data.user;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle<{ account_status: "active" | "deactivated" | null }>();

    if (profile?.account_status === "deactivated") {
      await supabase.auth.signOut();
      redirect("/login?error=deactivated");
    }

    if (next && next.startsWith("/") && !next.startsWith("//")) {
      redirect(next);
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

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-10">
        <div className="mb-6">
          <Link href="/" className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900">
            홈으로 돌아가기
          </Link>
        </div>

        <div className="space-y-6">
        {showDeactivatedMessage ? (
          <Alert variant="destructive">
            <AlertTitle>비활성화된 계정입니다</AlertTitle>
            <AlertDescription>
              계정 삭제 요청으로 로그인할 수 없습니다. 복구가 필요하면 해당 테넌트 관리자에게 문의해 주세요.
            </AlertDescription>
          </Alert>
        ) : null}
        <UserAuthPanel teamName={branding.teamName} logoUrl={branding.logoUrl} />
        <UserLoginForm next={next} />
        </div>
      </main>
    </div>
  );
}
