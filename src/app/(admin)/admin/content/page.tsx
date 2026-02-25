import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ContentManager } from "@/components/admin/content-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrimaryProgram, getProgramContentRows, requireAdminUser } from "@/lib/admin/server";

export default async function AdminContentPage() {
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

  const contentItems = await getProgramContentRows(supabase, program.id);

  return (
    <AdminPageShell title="콘텐츠" description="핵심 메시지, 코치 경력, 가치, 혜택을 관리합니다.">
      <ContentManager programId={program.id} contentItems={contentItems} />
    </AdminPageShell>
  );
}
