import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { TrainingManager } from "@/components/admin/training-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPrimaryProgram, getTrainingSectionsAndDetails, requireAdminUser } from "@/lib/admin/server";

export default async function AdminTrainingPage() {
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

  const { sections, sectionDetails } = await getTrainingSectionsAndDetails(supabase, program.id);

  return (
    <AdminPageShell title="트레이닝" description="트레이닝 섹션과 세부 항목을 관리합니다.">
      <TrainingManager programId={program.id} sections={sections} sectionDetails={sectionDetails} />
    </AdminPageShell>
  );
}
