import { Suspense } from "react";

import { DateSessionNavigator } from "@/components/home/date-session-navigator";
import { OfflineClassesList } from "@/components/offline-classes/offline-classes-list";
import { NoticesList } from "@/components/notices/notices-list";
import { ProgramHeader } from "@/components/home/program-header";
import { Card, CardContent } from "@/components/ui/card";
import { getPublishedNotices, getPublishedOfflineClasses } from "@/lib/admin/server";
import { getTrainingAppDataFromSupabase } from "@/lib/training/supabase-repository";

export default async function TenantHomePage() {
  const [appData, notices, offlineClassData] = await Promise.all([
    getTrainingAppDataFromSupabase(),
    getPublishedNotices(3),
    getPublishedOfflineClasses({ limit: 3, upcomingOnly: true }),
  ]);

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

      <OfflineClassesList
        classes={offlineClassData.classes}
        currentUserId={offlineClassData.currentUserId}
        title="오프라인 클래스"
        description="다가오는 클래스 3개를 확인하고 바로 신청할 수 있습니다."
        emptyMessage="진행 예정 오프라인 클래스가 없습니다."
        showAllLink
      />
    </>
  );
}
