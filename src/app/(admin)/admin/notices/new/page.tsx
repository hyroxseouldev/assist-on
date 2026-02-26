import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { NoticeCreateForm } from "@/components/admin/notice-create-form";
import { requireAdminUser } from "@/lib/admin/server";

export default async function AdminNoticeNewPage() {
  await requireAdminUser();

  return (
    <AdminPageShell title="공지 등록" description="제목과 본문을 작성해 새 공지를 등록합니다.">
      <NoticeCreateForm />
    </AdminPageShell>
  );
}
