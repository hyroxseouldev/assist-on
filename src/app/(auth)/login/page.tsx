import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/auth/login-hero";
import { getPrimaryProgramBranding } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "로그인 | Assist On",
  description: "Assist On 하이록스 트레이닝 팀 로그인",
};

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBranding()]);
  const user = userRes.data.user;

  if (user) {
    redirect("/t/select");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <LoginHero teamName={branding.teamName} logoUrl={branding.logoUrl} />
        <LoginForm />
      </main>
    </div>
  );
}
