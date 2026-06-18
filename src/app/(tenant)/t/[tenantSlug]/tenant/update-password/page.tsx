import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthLandingShell } from "@/components/auth/auth-landing-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getTenantLoginPath, getTenantResetPasswordPath } from "@/lib/auth/paths";
import { getPrimaryProgramBrandingForTenant } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "새 비밀번호 설정 | Assist On",
  description: "Assist On 비밀번호 업데이트",
};

export default async function TenantUpdatePasswordPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBrandingForTenant(tenantSlug)]);
  const user = userRes.data.user;

  if (!user) {
    redirect(getTenantResetPasswordPath(tenantSlug));
  }

  return (
    <AuthLandingShell
      title="새 비밀번호를 설정하세요"
      description={`${branding.teamName} 관리자 계정의 새 비밀번호를 저장합니다.`}
      eyebrow="Tenant Admin"
      logoUrl={branding.logoUrl}
      brandName={branding.teamName}
    >
      <UpdatePasswordForm redirectTo={getTenantLoginPath(tenantSlug)} />
    </AuthLandingShell>
  );
}
