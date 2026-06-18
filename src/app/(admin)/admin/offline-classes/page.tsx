import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { OfflineClassesList } from "@/components/admin/offline-classes-list";
import { getAdminOfflineClasses, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminOfflineClassesPage() {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const { supabase } = await requireAdminUser(tenantSlug);
  const classes = await getAdminOfflineClasses(supabase, tenantSlug);

  return (
    <AdminPageShell title="오프라인 클래스" description="리스트에서 클래스를 선택해 수정하거나 새 클래스를 등록합니다.">
      <OfflineClassesList classes={classes} />
    </AdminPageShell>
  );
}
