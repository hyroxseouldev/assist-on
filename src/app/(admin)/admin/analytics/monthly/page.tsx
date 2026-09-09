import { MonthlyAnalyticsPage } from "@/components/admin/monthly-analytics-page";
import { getCurrentAdminTenantSlug } from "@/lib/admin/current";

export default async function AdminMonthlyAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const tenantSlug = await getCurrentAdminTenantSlug();

  return <MonthlyAnalyticsPage tenantSlug={tenantSlug} basePath="/admin" searchParams={searchParams} />;
}
