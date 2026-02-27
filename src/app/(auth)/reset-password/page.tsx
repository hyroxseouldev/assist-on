import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { TenantAuthPanel } from "@/components/auth/tenant-auth-panel";
import { getPrimaryProgramBranding } from "@/lib/program/branding";

export const metadata: Metadata = {
  title: "비밀번호 재설정 | Assist On",
  description: "Assist On 비밀번호 재설정",
};

export default async function ResetPasswordPage() {
  const branding = await getPrimaryProgramBranding();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <TenantAuthPanel teamName={branding.teamName} logoUrl={branding.logoUrl} />
        <ResetPasswordForm />
      </main>
    </div>
  );
}
