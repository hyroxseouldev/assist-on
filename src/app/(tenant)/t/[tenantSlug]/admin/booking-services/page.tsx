import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BookingServicesList } from "@/components/admin/booking-services-list";
import { getAdminBookingServicesPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminBookingServicesPage({
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
  const services = await getAdminBookingServicesPage(supabase, { page, pageSize });

  return (
    <AdminPageShell title="예약 서비스" description="등록된 서비스 목록을 보고 상세 페이지에서 옵션과 슬롯을 관리합니다.">
      <BookingServicesList
        services={services.items}
        total={services.total}
        page={services.page}
        pageSize={services.pageSize}
        totalPages={services.totalPages}
      />
    </AdminPageShell>
  );
}
