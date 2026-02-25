import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { OfflineClassesManager } from "@/components/admin/offline-classes-manager";
import { getAdminOfflineClasses, requireAdminUser } from "@/lib/admin/server";

export default async function AdminOfflineClassesPage() {
  const { supabase } = await requireAdminUser();
  const classes = await getAdminOfflineClasses(supabase);

  return (
    <AdminPageShell title="오프라인 클래스" description="클래스 일정과 정원을 관리하고 참가자를 확인합니다.">
      <OfflineClassesManager classes={classes} />
    </AdminPageShell>
  );
}
