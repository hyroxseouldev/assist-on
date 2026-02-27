import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserSignupForm } from "@/components/auth/user-signup-form";
import { UserAuthPanel } from "@/components/auth/user-auth-panel";
import { Button } from "@/components/ui/button";
import { getPrimaryProgramBranding } from "@/lib/program/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "가입하기 | Assist On",
  description: "Assist On 사용자 가입",
};

function isSafeInternalPath(value: string | undefined) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  const supabase = await createSupabaseServerClient();
  const [userRes, branding] = await Promise.all([supabase.auth.getUser(), getPrimaryProgramBranding()]);

  if (userRes.data.user) {
    if (isSafeInternalPath(next)) {
      redirect(next!);
    }
    redirect("/t/select");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#d7f7e5_0%,#effaf4_45%,#ffffff_100%)]">
      <div className="mx-auto flex w-full max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/" className="gap-1.5">
            <ArrowLeft className="size-4" />
            뒤로가기
          </Link>
        </Button>
      </div>
      <main className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:px-8">
        <UserAuthPanel teamName={branding.teamName} logoUrl={branding.logoUrl} />
        <UserSignupForm next={next} />
      </main>
    </div>
  );
}
