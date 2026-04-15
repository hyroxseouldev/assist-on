import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { CoachProfileCreateForm } from "@/components/admin/coach-profile-create-form";
import { getAdminCoachProfiles, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminCoachNewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, tenant, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug);
  const { candidates } = await getAdminCoachProfiles(supabase, tenantSlug);
  const canManageMembers = isPlatformAdmin || tenantRole === "owner";

  return (
    <AdminPageShell
      title="코치 생성"
      description="새 코치 프로필을 등록합니다."
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
