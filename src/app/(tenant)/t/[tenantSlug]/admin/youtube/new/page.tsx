import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { YoutubeContentCreateForm } from "@/components/admin/youtube-content-create-form";
import { requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminYoutubeContentNewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireAdminUser(tenantSlug);

  return (
    <AdminPageShell title="유튜브 영상 등록" description="유튜브 링크와 앱 목록에 표시할 정보를 입력합니다.">
      <YoutubeContentCreateForm tenantSlug={tenantSlug} />
    </AdminPageShell>
  );
}
