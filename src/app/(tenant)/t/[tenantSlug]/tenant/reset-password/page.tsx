import type { Metadata } from "next";

import { AuthLandingShell } from "@/components/auth/auth-landing-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getPrimaryProgramBrandingForTenant } from "@/lib/program/branding";

export const metadata: Metadata = {
  title: "비밀번호 재설정 | Assist On",
  description: "Assist On 비밀번호 재설정",
};

export default async function TenantResetPasswordPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const branding = await getPrimaryProgramBrandingForTenant(tenantSlug);

  return (
    <AuthLandingShell
      title="비밀번호를 다시 설정하세요"
      description={`${branding.teamName} 관리자 워크스페이스에 다시 접속할 수 있도록 재설정 링크를 보내드립니다.`}
      eyebrow="Tenant Admin"
      logoUrl={branding.logoUrl}
      brandName={branding.teamName}
    >
      <ResetPasswordForm tenantSlug={tenantSlug} />
    </AuthLandingShell>
  );
}
