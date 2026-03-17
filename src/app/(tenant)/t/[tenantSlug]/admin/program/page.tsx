import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramsList } from "@/components/admin/programs-list";
import { getAdminProgramsPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminProgramPage({
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
  const programs = await getAdminProgramsPage(supabase, tenantSlug, { page, pageSize });

  return (
    <AdminPageShell title="프로그램" description="프로그램을 생성하고 기간/설명을 관리합니다.">
      <ProgramsList
        programs={programs.items}
        total={programs.total}
        page={programs.page}
        pageSize={programs.pageSize}
        totalPages={programs.totalPages}
      />
    </AdminPageShell>
  );
}
