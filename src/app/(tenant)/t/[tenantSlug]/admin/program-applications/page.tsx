import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramApplicationsList } from "@/components/admin/program-applications-list";
import { getAdminProgramApplicationsPage, requireAdminUser } from "@/lib/admin/server";
import type { AdminProgramApplicationFilter } from "@/lib/admin/types";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseApplicationFilter(value: string | undefined): AdminProgramApplicationFilter {
  if (value === "all" || value === "pending" || value === "approved" || value === "rejected" || value === "canceled") {
    return value;
  }

  return "pending";
}

export default async function TenantAdminProgramApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const filter = parseApplicationFilter(typeof resolvedSearchParams.filter === "string" ? resolvedSearchParams.filter : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const applications = await getAdminProgramApplicationsPage(supabase, tenantSlug, { filter, page, pageSize });

  return (
    <AdminPageShell title="프로그램 신청" description="프로그램 신청 내역과 승인 상태를 관리합니다.">
      <ProgramApplicationsList
        applications={applications.items}
        total={applications.total}
        page={applications.page}
        pageSize={applications.pageSize}
        totalPages={applications.totalPages}
        filter={applications.filter}
      />
    </AdminPageShell>
  );
}
