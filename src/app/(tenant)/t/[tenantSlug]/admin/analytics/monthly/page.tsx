import { MonthlyAnalyticsPage } from "@/components/admin/monthly-analytics-page";

export default async function TenantAdminMonthlyAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenantSlug } = await params;

  return (
    <MonthlyAnalyticsPage
      tenantSlug={tenantSlug}
      basePath={`/t/${tenantSlug}/admin`}
      searchParams={searchParams}
    />
  );
}
