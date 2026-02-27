import { Suspense } from "react";
import Link from "next/link";

import { DateSessionNavigator } from "@/components/home/date-session-navigator";
import { HomeNoticesTable } from "@/components/home/home-notices-table";
import { ProgramHeader } from "@/components/home/program-header";
import { HomeOfflineClassesTable } from "@/components/home/home-offline-classes-table";
import { ProgramSwitcher } from "@/components/home/program-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublishedNotices, getPublishedOfflineClasses } from "@/lib/admin/server";
import { getTrainingAppDataFromSupabase } from "@/lib/training/supabase-repository";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const noticesPath = `/t/${tenantSlug}/notices`;
  const offlineClassesPath = `/t/${tenantSlug}/offline-classes`;
  const storePath = `/store/${tenantSlug}`;

  const [appData, notices, offlineClassData] = await Promise.all([
    getTrainingAppDataFromSupabase(),
    getPublishedNotices(3),
    getPublishedOfflineClasses({ limit: 3, upcomingOnly: true }),
  ]);

  return (
    <>
      <ProgramHeader teamInfo={appData.teamInfo} coach={appData.coach} />

      <HomeNoticesTable notices={notices} noticesPath={noticesPath} />

      <ProgramSwitcher
        tenantSlug={tenantSlug}
        selectedProgramId={appData.selectedProgramId}
        programs={appData.availablePrograms ?? []}
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

      <HomeOfflineClassesTable classes={offlineClassData.classes} offlineClassesPath={offlineClassesPath} />
    </>
  );
}
