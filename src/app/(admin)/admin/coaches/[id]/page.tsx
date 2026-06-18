import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { CoachProfileEditForm } from "@/components/admin/coach-profile-edit-form";
import { getAdminCoachProfileById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminCoachDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, tenantSlug] = await Promise.all([params, getCurrentAdminTenantSlug()]);
  const { supabase, isPlatformAdmin, tenantRole, user } = await requireAdminUser(tenantSlug);
  const profile = await getAdminCoachProfileById(supabase, tenantSlug, id);

  if (!profile) {
    notFound();
  }

  const canManageMembers = isPlatformAdmin || tenantRole === "owner";
  const canEdit = canManageMembers || user.id === profile.user_id;

  return (
    <AdminPageShell
      title={profile.display_name}
      description="코치 프로필 상세를 수정합니다."
    >
      <CoachProfileEditForm
        tenantSlug={tenantSlug}
        profile={profile}
        canManageMembers={canManageMembers}
        canEdit={canEdit}
      />
    </AdminPageShell>
  );
}
