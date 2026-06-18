import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthLandingShell } from "@/components/auth/auth-landing-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getTenantResetPasswordPath, getTenantUpdatePasswordPath } from "@/lib/auth/paths";
import { resolveAuthBrandingTenantSlug } from "@/lib/auth/tenant-branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "새 비밀번호 설정 | Assist On",
  description: "Assist On 비밀번호 업데이트",
};

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tenantSlug = resolveAuthBrandingTenantSlug(params);

  if (tenantSlug) {
    redirect(getTenantUpdatePasswordPath(tenantSlug));
  }

  const supabase = await createSupabaseServerClient();
  const userRes = await supabase.auth.getUser();
  const user = userRes.data.user;

  if (!user) {
    redirect(tenantSlug ? getTenantResetPasswordPath(tenantSlug) : "/reset-password");
  }

  return (
    <AuthLandingShell
      title="새 비밀번호를 설정하세요"
      description="계정 보안을 위해 새 비밀번호를 저장한 뒤 관리자 로그인 화면으로 이동합니다."
      brandName="clyrtraining"
    >
      <UpdatePasswordForm redirectTo="/login" />
    </AuthLandingShell>
  );
}
