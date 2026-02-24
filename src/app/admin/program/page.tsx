import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramEditor } from "@/components/admin/program-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrimaryProgram, requireAdminUser } from "@/lib/admin/server";

export default async function AdminProgramPage() {
  const { supabase } = await requireAdminUser();
  const program = await getPrimaryProgram(supabase);

  if (!program) {
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

  return (
    <AdminPageShell title="프로그램" description="홈 상단 및 팀 소개의 기본 정보를 수정합니다.">
      <ProgramEditor program={program} />
    </AdminPageShell>
  );
}
