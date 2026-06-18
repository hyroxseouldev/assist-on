import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { CoachProfilesList } from "@/components/admin/coach-profiles-list";
import { getAdminCoachProfiles, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminCoachesPage() {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const { supabase, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug);
  const { profiles } = await getAdminCoachProfiles(supabase, tenantSlug);
  const canManageMembers = isPlatformAdmin || tenantRole === "owner";

  return (
    <AdminPageShell
      title="코치 관리"
      description="리스트에서 코치를 선택해 수정하거나 새 코치 프로필을 등록합니다."
    >
      <CoachProfilesList tenantSlug={tenantSlug} profiles={profiles} canManageMembers={canManageMembers} />
    </AdminPageShell>
  );
}
