import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { InvitationManager } from "@/components/admin/invitation-manager";
import { requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminInvitationsPage() {
  await requireAdminUser();

  return (
    <AdminPageShell title="초대 관리" description="초대 메일을 발송해 가입을 진행합니다.">
      <InvitationManager />
    </AdminPageShell>
  );
}
