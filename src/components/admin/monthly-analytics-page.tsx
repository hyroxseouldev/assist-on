import { redirect } from "next/navigation";

import { MonthlyAnalyticsReport } from "@/components/admin/monthly-analytics-report";
import {
  getCurrentSeoulMonth,
  getMonthlyAnalyticsReport,
  normalizeAnalyticsMonth,
} from "@/lib/admin/monthly-analytics";
import { requireAdminUser } from "@/lib/admin/server";

type MonthlyAnalyticsPageProps = {
  tenantSlug: string;
  basePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export async function MonthlyAnalyticsPage({ tenantSlug, basePath, searchParams }: MonthlyAnalyticsPageProps) {
  const { supabase, tenant, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug, { allowCoach: true });

  if (!isPlatformAdmin && tenantRole !== "owner") {
    redirect(basePath);
  }

  const resolvedSearchParams = await searchParams;
  const requestedMonth = typeof resolvedSearchParams.month === "string" ? resolvedSearchParams.month : undefined;
  const month = normalizeAnalyticsMonth(requestedMonth);
  const report = await getMonthlyAnalyticsReport(supabase, tenant.id, month);

  return <MonthlyAnalyticsReport report={report} basePath={basePath} currentMonth={getCurrentSeoulMonth()} />;
}
