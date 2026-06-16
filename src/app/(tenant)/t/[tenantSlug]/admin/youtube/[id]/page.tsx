import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { YoutubeContentEditForm } from "@/components/admin/youtube-content-edit-form";
import { getAdminYoutubeContentById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminYoutubeContentDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }> | { tenantSlug: string; id: string };
}) {
  const { tenantSlug, id } = await params;
  const { supabase } = await requireAdminUser(tenantSlug);
  const content = await getAdminYoutubeContentById(supabase, tenantSlug, id);

  if (!content) {
    notFound();
  }

  return (
    <AdminPageShell title="유튜브 영상 수정" description="영상 링크와 공개 상태를 관리합니다.">
      <YoutubeContentEditForm tenantSlug={tenantSlug} content={content} />
    </AdminPageShell>
  );
}
