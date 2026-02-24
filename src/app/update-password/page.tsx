import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginHero } from "@/components/auth/login-hero";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "새 비밀번호 설정 | Assist On",
  description: "Assist On 비밀번호 업데이트",
};

export default async function UpdatePasswordPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/reset-password");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <LoginHero />
        <UpdatePasswordForm />
      </main>
    </div>
  );
}
