import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserAuthPanel } from "@/components/auth/user-auth-panel";
import { UserLoginForm } from "@/components/auth/user-login-form";
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

  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBranding()]);
  const user = userRes.data.user;

  if (user) {
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
      redirect(isAdminRole ? `/t/${slug}/admin` : "/mypage/subscriptions");
    }

    const hasAdminTenant = tenantMemberships.some((membership) => membership.role === "owner" || membership.role === "coach");
    if (!hasAdminTenant) {
      redirect("/mypage/subscriptions");
    }

    redirect("/t/select");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <div className="mx-auto flex w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/" className="gap-1.5">
            <ArrowLeft className="size-4" />
            뒤로가기
          </Link>
        </Button>
      </div>
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <UserAuthPanel teamName={branding.teamName} logoUrl={branding.logoUrl} />
        <UserLoginForm next={next} />
      </main>
    </div>
  );
}
