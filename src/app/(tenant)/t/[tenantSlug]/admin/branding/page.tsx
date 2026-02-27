import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { TenantBrandingEditor } from "@/components/admin/tenant-branding-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantBrandingEditorData, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminBrandingPage() {
  const { supabase } = await requireAdminUser();
  const branding = await getTenantBrandingEditorData(supabase);

  if (!branding) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>브랜딩 데이터 없음</CardTitle>
          <CardDescription>tenant_branding 데이터를 먼저 확인해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600">마이그레이션 적용 후 다시 시도해 주세요.</CardContent>
      </Card>
    );
  }

  return (
    <AdminPageShell title="브랜딩" description="테넌트 공통 브랜딩과 코치 정보를 관리합니다.">
      <TenantBrandingEditor branding={branding} />
    </AdminPageShell>
  );
}
