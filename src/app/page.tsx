import { Suspense } from "react";
import { redirect } from "next/navigation";

import { DateSessionNavigator } from "@/components/home/date-session-navigator";
import { ProgramHeader } from "@/components/home/program-header";
import { ProgramSummary } from "@/components/home/program-summary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutAction } from "@/app/actions/auth";
import { LocalTrainingRepository } from "@/lib/training/local-repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    typeof profile?.full_name === "string" && profile.full_name.length > 0
      ? profile.full_name
      : typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : user.email ?? "Athlete";
  const avatarUrl =
    typeof profile?.avatar_url === "string"
      ? profile.avatar_url
      : typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : undefined;
  const fallback = displayName.slice(0, 1).toUpperCase();

  const repository = new LocalTrainingRepository();
  const appData = await repository.getTrainingAppData();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#d9fbe6_0%,#f7faf8_45%,#ffffff_100%)]">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Card className="border-zinc-200/70 bg-white/90 py-3 backdrop-blur-sm">
          <CardContent className="flex items-center justify-between gap-3 px-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={avatarUrl} alt={`${displayName} 프로필`} />
                <AvatarFallback>{fallback}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-zinc-500">환영합니다</p>
                <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
              </div>
            </div>

            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                로그아웃
              </Button>
            </form>
          </CardContent>
        </Card>

        <ProgramHeader teamInfo={appData.teamInfo} coach={appData.coach} period={appData.period} />

        <Suspense
          fallback={
            <Card className="border-zinc-200/70 bg-white/90 backdrop-blur-sm">
              <CardContent className="py-8 text-center text-sm text-zinc-500">세션을 불러오는 중...</CardContent>
            </Card>
          }
        >
          <DateSessionNavigator sessions={appData.sessions} period={appData.period} />
        </Suspense>

        <ProgramSummary
          teamInfo={appData.teamInfo}
          coach={appData.coach}
          philosophy={appData.philosophy}
          mindset={appData.mindset}
          benefits={appData.benefits}
          trainingProgram={appData.trainingProgram}
        />
      </main>
    </div>
  );
}
