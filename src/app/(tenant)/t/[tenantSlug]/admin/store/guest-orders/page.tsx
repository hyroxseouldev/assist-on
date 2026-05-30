import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { GuestOrdersList } from "@/components/admin/guest-orders-list";
import { getAdminGuestOrdersPage, requireAdminUser } from "@/lib/admin/server";
import type { AdminGuestOrderFilter } from "@/lib/admin/types";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseGuestOrderFilter(value: string | undefined): AdminGuestOrderFilter {
  if (value === "all" || value === "pending" || value === "confirmed" || value === "canceled") {
    return value;
  }

  return "pending";
}

export default async function TenantAdminGuestOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const filter = parseGuestOrderFilter(typeof resolvedSearchParams.filter === "string" ? resolvedSearchParams.filter : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const orders = await getAdminGuestOrdersPage(supabase, tenantSlug, { filter, page, pageSize });

  return (
    <AdminPageShell title="게스트 주문" description="랜딩 페이지에서 접수된 비회원 주문을 확인하고 상태를 관리합니다.">
      <GuestOrdersList
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
