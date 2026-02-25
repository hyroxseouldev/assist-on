import { Suspense } from "react";

import { DateSessionNavigator } from "@/components/home/date-session-navigator";
import { NoticesList } from "@/components/notices/notices-list";
import { ProgramHeader } from "@/components/home/program-header";
import { Card, CardContent } from "@/components/ui/card";
import { getPublishedNotices } from "@/lib/admin/server";
import { getTrainingAppDataFromSupabase } from "@/lib/training/supabase-repository";

export default async function Home() {
  const [appData, notices] = await Promise.all([getTrainingAppDataFromSupabase(), getPublishedNotices(3)]);

  return (
    <>
      <ProgramHeader teamInfo={appData.teamInfo} coach={appData.coach} period={appData.period} />

      <NoticesList
        notices={notices}
        title="공지사항"
        description="최신 공지 3개를 확인하세요."
        emptyMessage="등록된 공지사항이 없습니다."
        showAllLink
      />

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
