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
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdminUser();
  const page = parsePositiveInt(typeof params.page === "string" ? params.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof params.pageSize === "string" ? params.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const programs = await getAdminProgramsPage(supabase, { page, pageSize });

  return (
    <AdminPageShell title="프로그램 관리" description="프로그램을 생성하고 기간/설명을 관리합니다.">
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
