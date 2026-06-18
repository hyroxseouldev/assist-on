import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { NoticeEditForm } from "@/components/admin/notice-edit-form";
import { getAdminNoticeById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminNoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const [{ id }, tenantSlug] = await Promise.all([params, getCurrentAdminTenantSlug()]);
  const { supabase } = await requireAdminUser(tenantSlug);
  const notice = await getAdminNoticeById(supabase, tenantSlug, id);

  if (!notice) {
    notFound();
  }

  return (
    <AdminPageShell title="공지 수정" description="공지 내용을 수정하고 공개 상태를 관리합니다.">
      <NoticeEditForm tenantSlug={tenantSlug} notice={notice} />
    </AdminPageShell>
  );
}
