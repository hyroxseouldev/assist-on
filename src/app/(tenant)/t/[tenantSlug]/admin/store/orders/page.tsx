import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramOrdersList } from "@/components/admin/program-orders-list";
import { getAdminProgramOrders, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminStoreOrdersPage() {
  const { supabase } = await requireAdminUser();
  const orders = await getAdminProgramOrders(supabase);

  return (
    <AdminPageShell title="스토어 주문" description="결제 상태와 주문 현황을 확인합니다.">
      <ProgramOrdersList orders={orders} />
    </AdminPageShell>
  );
}
