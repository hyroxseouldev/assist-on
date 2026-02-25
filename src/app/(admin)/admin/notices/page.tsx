import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { NoticesManager } from "@/components/admin/notices-manager";
import { getAdminNotices, requireAdminUser } from "@/lib/admin/server";

export default async function AdminNoticesPage() {
  const { supabase } = await requireAdminUser();
  const notices = await getAdminNotices(supabase);

  return (
    <AdminPageShell title="공지사항" description="홈과 공지사항 페이지에 노출될 공지를 관리합니다.">
      <NoticesManager notices={notices} />
    </AdminPageShell>
  );
}
