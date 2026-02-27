import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TenantAuthPanel } from "@/components/auth/tenant-auth-panel";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { getPrimaryProgramBranding } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "새 비밀번호 설정 | Assist On",
  description: "Assist On 비밀번호 업데이트",
};

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBranding()]);
  const user = userRes.data.user;

  if (!user) {
    redirect("/reset-password");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <TenantAuthPanel teamName={branding.teamName} logoUrl={branding.logoUrl} />
        <UpdatePasswordForm />
      </main>
    </div>
  );
}
