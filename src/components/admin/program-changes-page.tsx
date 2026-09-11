import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramChangesManager } from "@/components/admin/program-changes-manager";
import { getProgramChangeUsersPage } from "@/lib/admin/program-change-search";
import { getTenantSessionPrograms, requireAdminUser } from "@/lib/admin/server";

export type ProgramChangesSearchParams = Record<string, string | string[] | undefined>;

export async function ProgramChangesPage({ tenantSlug, searchParams }: {
  tenantSlug: string;
  searchParams: ProgramChangesSearchParams;
}) {
  await requireAdminUser(tenantSlug, { allowManager: true });
  const supabase = createSupabaseAdminClient();
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const rawProgramId = typeof searchParams.program === "string" ? searchParams.program : "";
  const programId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawProgramId)
    ? rawProgramId : null;
  const activeOnly = searchParams.active === "1";
  const rawPage = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.min(2147483647, Math.floor(rawPage)) : 1;
  const [result, programs] = await Promise.all([
    getProgramChangeUsersPage(tenantSlug, { query, programId, activeOnly, page }),
    getTenantSessionPrograms(supabase, tenantSlug),
  ]);

  return (
    <AdminPageShell title="참여 프로그램 변경" description="회원을 검색해 참여 프로그램을 변경하고 변경 이력을 확인합니다. 기존 운동 기록과 피드백, 이용 종료일은 유지됩니다.">
      <ProgramChangesManager
        key={JSON.stringify([query, programId, activeOnly, result.page])}
        users={result.items}
        programs={programs}
        query={query}
        programId={programId}
        activeOnly={activeOnly}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        nowTimestamp={result.nowTimestamp}
      />
    </AdminPageShell>
  );
}
