import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { GuestOrdersRevenueChart } from "@/components/admin/guest-orders-revenue-chart";
import { getAdminGuestOrderRevenuePage, requireAdminUser } from "@/lib/admin/server";
import type { AdminGuestOrderRevenueRange } from "@/lib/admin/types";

function parseRevenueRange(value: string | undefined): AdminGuestOrderRevenueRange {
  if (value === "6" || value === "12" || value === "24" || value === "all") {
    return value;
  }

  return "12";
}

export default async function TenantAdminGuestOrdersRevenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const range = parseRevenueRange(typeof resolvedSearchParams.range === "string" ? resolvedSearchParams.range : undefined);
  const revenue = await getAdminGuestOrderRevenuePage(supabase, tenantSlug, { range });

  return (
    <AdminPageShell title="게스트 매출" description="확정된 게스트 주문의 월별 매출과 주문 수를 확인합니다.">
      <GuestOrdersRevenueChart items={revenue.items} summary={revenue.summary} range={revenue.range} />
    </AdminPageShell>
  );
}
