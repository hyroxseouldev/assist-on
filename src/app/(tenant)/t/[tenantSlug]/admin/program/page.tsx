import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramInfoEditor } from "@/components/admin/program-info-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProgramInfoEditorData, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminProgramPage() {
  const { supabase } = await requireAdminUser();
  const program = await getProgramInfoEditorData(supabase);

  if (!program) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>프로그램 데이터 없음</CardTitle>
          <CardDescription>programs 데이터를 먼저 확인해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600">Supabase migration/seed 실행 후 다시 시도해 주세요.</CardContent>
      </Card>
    );
  }

  return (
    <AdminPageShell title="프로그램 정보" description="팀/코치/기간 정보를 관리합니다.">
      <ProgramInfoEditor program={program} />
    </AdminPageShell>
  );
}
