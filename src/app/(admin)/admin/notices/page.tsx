import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { NoticesList } from "@/components/admin/notices-list";
import { getAdminNotices, requireAdminUser } from "@/lib/admin/server";

export default async function AdminNoticesPage() {
  const { supabase } = await requireAdminUser();
  const notices = await getAdminNotices(supabase);

  return (
    <AdminPageShell title="공지사항" description="리스트에서 공지를 선택해 수정하거나 새 공지를 등록합니다.">
      <NoticesList notices={notices} />
    </AdminPageShell>
  );
}
