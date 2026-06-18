import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthLandingShell } from "@/components/auth/auth-landing-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getTenantResetPasswordPath } from "@/lib/auth/paths";
import { resolveAuthBrandingTenantSlug } from "@/lib/auth/tenant-branding";

export const metadata: Metadata = {
  title: "비밀번호 재설정 | Assist On",
  description: "Assist On 비밀번호 재설정",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tenantSlug = resolveAuthBrandingTenantSlug(params);

  if (tenantSlug) {
    redirect(getTenantResetPasswordPath(tenantSlug));
  }

  return (
    <AuthLandingShell
      title="다시 안전하게 접속하세요"
      description="가입한 이메일로 비밀번호 재설정 링크를 보내 관리자 워크스페이스 접근을 복구합니다."
      brandName="clyrtraining"
    >
      <ResetPasswordForm />
    </AuthLandingShell>
  );
}
