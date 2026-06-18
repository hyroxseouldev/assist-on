import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramOrdersList } from "@/components/admin/program-orders-list";
import { getAdminProgramOrdersPage, requireAdminUser } from "@/lib/admin/server";
import type { AdminProgramOrderFilter } from "@/lib/admin/types";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseOrderFilter(value: string | undefined): AdminProgramOrderFilter {
  if (value === "all" || value === "bank_pending" || value === "bank_paid" || value === "toss") {
    return value;
  }

  return "bank_pending";
}

export default async function TenantAdminStoreOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const filter = parseOrderFilter(typeof resolvedSearchParams.filter === "string" ? resolvedSearchParams.filter : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const orders = await getAdminProgramOrdersPage(supabase, tenantSlug, { filter, page, pageSize });

  return (
    <AdminPageShell title="주문" description="결제 상태와 주문 현황을 확인합니다.">
      <ProgramOrdersList
        orders={orders.items}
        total={orders.total}
        page={orders.page}
        pageSize={orders.pageSize}
        totalPages={orders.totalPages}
        filter={orders.filter}
      />
    </AdminPageShell>
  );
}
