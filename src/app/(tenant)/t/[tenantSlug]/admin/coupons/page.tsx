import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { GuestOrderCouponsManager } from "@/components/admin/guest-order-coupons-manager";
import { getAdminGuestOrderCouponsPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminCouponsPage({
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
  const coupons = await getAdminGuestOrderCouponsPage(supabase, tenantSlug, { page, pageSize });

  return (
    <AdminPageShell title="쿠폰 관리" description="게스트 주문에 사용할 할인 코드를 생성하고 관리합니다.">
      <GuestOrderCouponsManager
        coupons={coupons.items}
        total={coupons.total}
        page={coupons.page}
        pageSize={coupons.pageSize}
        totalPages={coupons.totalPages}
      />
    </AdminPageShell>
  );
}
