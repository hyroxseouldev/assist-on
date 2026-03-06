import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { CommunityReportsManager } from "@/components/admin/community-reports-manager";
import { getAdminCommunityReportsPage, requireAdminUser } from "@/lib/admin/server";
import type { CommunityReportStatus } from "@/lib/admin/types";

function parseReportStatus(value: string | undefined): CommunityReportStatus | "all" {
  if (value === "open" || value === "resolved" || value === "rejected") {
    return value;
  }

  return "open";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdminUser();

  const reportStatus = parseReportStatus(typeof params.reportStatus === "string" ? params.reportStatus : undefined);
  const query = typeof params.q === "string" ? params.q : "";
  const page = parsePositiveInt(typeof params.page === "string" ? params.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof params.pageSize === "string" ? params.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;

  const reports = await getAdminCommunityReportsPage(supabase, {
    status: reportStatus,
    query,
    page,
    pageSize,
  });

  return (
    <AdminPageShell title="커뮤니티 신고" description="신고 내역을 확인하고 해결/기각 처리합니다.">
      <CommunityReportsManager
        items={reports.items}
        total={reports.total}
        page={reports.page}
        pageSize={reports.pageSize}
        totalPages={reports.totalPages}
        query={query}
        status={reportStatus}
      />
    </AdminPageShell>
  );
}
