import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { TenantAuthPanel } from "@/components/auth/tenant-auth-panel";
import { Button } from "@/components/ui/button";
import { getPrimaryProgramBranding } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TenantMembershipRow = {
  tenant_id: string;
  tenants: {
    slug: string;
  } | null;
};

export const metadata: Metadata = {
  title: "테넌트 로그인 | Assist On",
  description: "Assist On 코치/운영자용 테넌트 워크스페이스 로그인",
};

export default async function TenantLoginPage() {
  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBranding()]);
  const user = userRes.data.user;

  if (user) {
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, tenants:tenant_id(slug)")
      .eq("user_id", user.id)
      .returns<TenantMembershipRow[]>();

    const tenantSlugs = (memberships ?? [])
      .map((membership) => membership.tenants?.slug)
      .filter((slug): slug is string => Boolean(slug));

    if (tenantSlugs.length === 1) {
      redirect(`/t/${tenantSlugs[0]}`);
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
        <TenantAuthPanel teamName={branding.teamName} logoUrl={branding.logoUrl} />
        <LoginForm />
      </main>
    </div>
  );
}
