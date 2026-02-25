import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SessionsCalendarManager } from "@/components/admin/sessions-calendar-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrimarySessionProgramId, getSessions, requireAdminUser } from "@/lib/admin/server";

export default async function AdminSessionsPage() {
  const { supabase } = await requireAdminUser();
  const programId = await getPrimarySessionProgramId(supabase);

  if (!programId) {
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

  const sessions = await getSessions(supabase, programId);

  return (
    <AdminPageShell title="세션 캘린더" description="날짜를 선택해 세션을 생성, 수정, 삭제합니다.">
      <SessionsCalendarManager programId={programId} sessions={sessions} />
    </AdminPageShell>
  );
}
