import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramChangesManager } from "@/components/admin/program-changes-manager";
import { getAdminAllUsersPage, getTenantSessionPrograms, requireAdminUser } from "@/lib/admin/server";

export type ProgramChangesSearchParams = Record<string, string | string[] | undefined>;

export async function ProgramChangesPage({ tenantSlug, searchParams }: {
  tenantSlug: string;
  searchParams: ProgramChangesSearchParams;
}) {
  await requireAdminUser(tenantSlug, { allowManager: true });
  const supabase = createSupabaseAdminClient();
  const query = typeof searchParams.q === "string" ? searchParams.q : "";
  const rawPage = typeof searchParams.page === "string" ? Number(searchParams.page) : 1;
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const [result, programs] = await Promise.all([
    getAdminAllUsersPage(supabase, tenantSlug, {
      query, programId: null, sortBy: "full_name", order: "asc", page, pageSize: 10,
    }),
    getTenantSessionPrograms(supabase, tenantSlug),
  ]);
  const now = new Date();

  return (
    <AdminPageShell title="참여 프로그램 변경" description="회원을 검색해 참여 프로그램을 변경하고 변경 이력을 확인합니다. 기존 운동 기록과 피드백, 이용 종료일은 유지됩니다.">
      <ProgramChangesManager
        users={result.items}
        programs={programs}
        query={query}
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        nowTimestamp={now.getTime()}
      />
    </AdminPageShell>
  );
}
