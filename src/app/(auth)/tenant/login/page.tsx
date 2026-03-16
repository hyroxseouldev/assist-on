import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { TenantAuthPanel } from "@/components/auth/tenant-auth-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  title: "테넌트 로그인 | Assist On",
  description: "Assist On 코치/운영자용 테넌트 워크스페이스 로그인",
};

export default async function TenantLoginPage({
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
      <div className="mx-auto flex w-full max-w-sm px-6 pt-6">
        <Button asChild variant="outline" size="sm" className="rounded-full border-white/80 bg-white/80 shadow-sm backdrop-blur">
          <Link href="/" className="gap-1.5">
            <ArrowLeft className="size-4" />
            뒤로가기
          </Link>
        </Button>
      </div>
      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-sm flex-col justify-center px-6 py-8">
        {showDeactivatedMessage ? (
          <Alert variant="destructive">
            <AlertTitle>비활성화된 계정입니다</AlertTitle>
            <AlertDescription>
              계정 삭제 요청으로 로그인할 수 없습니다. 복구가 필요하면 테넌트 owner 또는 플랫폼 관리자에게 문의해 주세요.
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="relative overflow-hidden rounded-[36px] border border-white/70 bg-white/90 px-5 py-6 shadow-[0_24px_80px_rgba(24,24,27,0.10)] backdrop-blur sm:px-6 sm:py-7">
          <div className="relative space-y-6">
            <TenantAuthPanel teamName={branding.teamName} logoUrl={branding.logoUrl} />
            <LoginForm next={next} />
          </div>
        </section>
      </main>
    </div>
  );
}
