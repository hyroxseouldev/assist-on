import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { InvitationManager } from "@/components/admin/invitation-manager";
import { getAdminTenantInvitations, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminInvitationsPage() {
  const { supabase, isPlatformAdmin, tenantRole } = await requireAdminUser();

  if (!isPlatformAdmin && tenantRole !== "owner") {
    return (
      <AdminPageShell title="초대 관리" description="owner 권한이 필요한 메뉴입니다.">
        <p className="text-sm text-zinc-600">초대 링크 생성/삭제는 owner만 수행할 수 있습니다.</p>
      </AdminPageShell>
    );
  }

  const invitations = await getAdminTenantInvitations(supabase);

  return (
    <AdminPageShell title="초대 관리" description="이메일 없이 링크로 멤버를 초대합니다.">
      <InvitationManager invitations={invitations} />
    </AdminPageShell>
  );
}
