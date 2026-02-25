import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AboutEditor } from "@/components/admin/about-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAboutEditorData, requireAdminUser } from "@/lib/admin/server";

export default async function AdminAboutPage() {
  const { supabase } = await requireAdminUser();
  const about = await getAboutEditorData(supabase);

  if (!about) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>About 데이터 없음</CardTitle>
          <CardDescription>about_content 데이터를 먼저 확인해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600">Supabase migration/seed 실행 후 다시 시도해 주세요.</CardContent>
      </Card>
    );
  }

  return (
    <AdminPageShell title="About 콘텐츠" description="팀 철학, 메시지, 프로그램 구성, 혜택을 관리합니다.">
      <AboutEditor about={about} />
    </AdminPageShell>
  );
}
