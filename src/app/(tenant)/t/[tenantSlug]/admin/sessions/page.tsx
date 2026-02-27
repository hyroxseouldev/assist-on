import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SessionsCalendarManager } from "@/components/admin/sessions-calendar-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessions, getTenantSessionPrograms, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const { programId: programIdParam } = await searchParams;
  const { supabase } = await requireAdminUser();
  const programs = await getTenantSessionPrograms(supabase);
  const selectedProgramId =
    programIdParam && programs.some((program) => program.id === programIdParam) ? programIdParam : programs[0]?.id;

  if (!selectedProgramId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>프로그램 데이터 없음</CardTitle>
          <CardDescription>seed 데이터가 비어 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600">Supabase migration seed를 먼저 실행해 주세요.</CardContent>
      </Card>
    );
  }

  const sessions = await getSessions(supabase, selectedProgramId);

  return (
    <AdminPageShell title="세션 캘린더" description="날짜를 선택해 세션을 생성, 수정, 삭제합니다.">
      <SessionsCalendarManager programId={selectedProgramId} sessions={sessions} programs={programs} />
    </AdminPageShell>
  );
}
