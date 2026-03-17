import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BookingServiceOrdersList } from "@/components/admin/booking-service-orders-list";
import { getAdminBookingReservationsPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminBookingServiceOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const orders = await getAdminBookingReservationsPage(supabase, { page, pageSize });

  return (
    <AdminPageShell title="예약 서비스 주문" description="들어온 예약 요청을 확인하고 상태를 처리합니다.">
      <BookingServiceOrdersList
        orders={orders.items}
        total={orders.total}
        page={orders.page}
        pageSize={orders.pageSize}
        totalPages={orders.totalPages}
      />
    </AdminPageShell>
  );
}
