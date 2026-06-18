import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { CoachProfileCreateForm } from "@/components/admin/coach-profile-create-form";
import { getAdminCoachProfiles, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminCoachCreatePage() {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const { supabase, tenant, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug);
  const { candidates } = await getAdminCoachProfiles(supabase, tenantSlug);
  const canManageMembers = isPlatformAdmin || tenantRole === "owner";

  return (
    <AdminPageShell
      title="코치 생성"
      description="내부 owner 또는 coach 멤버를 선택해 공개용 코치 프로필을 생성합니다."
    >
      <CoachProfileCreateForm
        tenantSlug={tenantSlug}
        tenantId={tenant.id}
        candidates={candidates}
        canManageMembers={canManageMembers}
      />
    </AdminPageShell>
  );
}
