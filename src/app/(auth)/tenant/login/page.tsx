import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDefaultSignedInPath, isSafeInternalPath, normalizeTenantMemberships, type TenantMembershipRow } from "@/lib/auth/redirects";
import { resolveAuthBrandingTenantSlug } from "@/lib/auth/tenant-branding";
import { getPrimaryProgramBrandingForTenant } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const tenantSlug = resolveAuthBrandingTenantSlug(params);

  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBrandingForTenant(tenantSlug)]);
  const user = userRes.data.user;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle<{ account_status: "active" | "deactivated" | null }>();

    if (profile?.account_status === "deactivated") {
      await supabase.auth.signOut();
      redirect(tenantSlug ? `/tenant/login?error=deactivated&tenant=${encodeURIComponent(tenantSlug)}` : "/tenant/login?error=deactivated");
    }

    if (next && isSafeInternalPath(next)) {
      redirect(next);
    }

    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenants:tenant_id(slug)")
      .eq("user_id", user.id)
      .returns<TenantMembershipRow[]>();

    redirect(getDefaultSignedInPath(normalizeTenantMemberships(memberships)));
  }

  return (
    <div className="min-h-screen bg-white">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
        {showDeactivatedMessage ? (
          <Alert variant="destructive">
            <AlertTitle>비활성화된 계정입니다</AlertTitle>
            <AlertDescription>
              계정 삭제 요청으로 로그인할 수 없습니다. 복구가 필요하면 테넌트 owner 또는 플랫폼 관리자에게 문의해 주세요.
            </AlertDescription>
          </Alert>
        ) : null}

        <LoginForm next={next} tenantSlug={tenantSlug} brandName={branding.teamName} logoUrl={branding.logoUrl} />
      </main>
    </div>
  );
}
