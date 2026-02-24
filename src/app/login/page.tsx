import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/auth/login-hero";

export const metadata: Metadata = {
  title: "로그인 | Assist On",
  description: "Assist On 하이록스 트레이닝 팀 로그인",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <LoginHero />
        <LoginForm />
      </main>
    </div>
  );
}
