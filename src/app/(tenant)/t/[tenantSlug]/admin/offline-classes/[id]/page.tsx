import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { OfflineClassEditForm } from "@/components/admin/offline-class-edit-form";
import { getAdminOfflineClassById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminOfflineClassDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }> | { tenantSlug: string; id: string };
}) {
  const { tenantSlug, id } = await params;
  const { supabase } = await requireAdminUser(tenantSlug);
  const offlineClass = await getAdminOfflineClassById(supabase, tenantSlug, id);

  if (!offlineClass) {
    notFound();
  }

  return (
    <AdminPageShell title="오프라인 클래스 수정" description="클래스 정보를 수정하고 참가자 목록을 확인합니다.">
      <OfflineClassEditForm offlineClass={offlineClass} />
    </AdminPageShell>
  );
}
