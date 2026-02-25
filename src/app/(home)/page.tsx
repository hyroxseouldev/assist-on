import { Suspense } from "react";

import { DateSessionNavigator } from "@/components/home/date-session-navigator";
import { ProgramHeader } from "@/components/home/program-header";
import { Card, CardContent } from "@/components/ui/card";
import { getTrainingAppDataFromSupabase } from "@/lib/training/supabase-repository";

export default async function Home() {
  const appData = await getTrainingAppDataFromSupabase();

  return (
    <>
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
    </>
  );
}
