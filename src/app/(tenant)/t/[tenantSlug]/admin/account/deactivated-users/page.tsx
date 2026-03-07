import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DeactivatedAccountsManager } from "@/components/admin/deactivated-accounts-manager";
import { getAdminDeactivatedAccounts, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminDeactivatedUsersPage() {
  const { supabase } = await requireAdminUser();
  const items = await getAdminDeactivatedAccounts(supabase);

  return (
    <AdminPageShell
      title="비활성 계정 관리"
      description="계정 삭제(비활성화) 처리된 테넌트 멤버를 확인하고 다시 활성화할 수 있습니다."
    >
      <DeactivatedAccountsManager items={items} />
    </AdminPageShell>
  );
}
