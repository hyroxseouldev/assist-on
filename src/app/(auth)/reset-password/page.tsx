import type { Metadata } from "next";

import { LoginHero } from "@/components/auth/login-hero";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "비밀번호 재설정 | Assist On",
  description: "Assist On 비밀번호 재설정",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <LoginHero />
        <ResetPasswordForm />
      </main>
    </div>
  );
}
