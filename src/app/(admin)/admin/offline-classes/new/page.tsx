import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { OfflineClassCreateForm } from "@/components/admin/offline-class-create-form";
import { requireAdminUser } from "@/lib/admin/server";

export default async function AdminOfflineClassNewPage() {
  await requireAdminUser();

  return (
    <AdminPageShell title="오프라인 클래스 등록" description="장소, 일정, 정원과 본문 내용을 입력해 새 클래스를 등록합니다.">
      <OfflineClassCreateForm />
    </AdminPageShell>
  );
}
