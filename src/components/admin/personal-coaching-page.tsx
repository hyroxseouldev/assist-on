import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramsList } from "@/components/admin/programs-list";
import { getAdminProgramsPage, requireAdminUser } from "@/lib/admin/server";
import { isPersonalHyroxProgram } from "@/lib/billing/model";

type SearchParams = Record<string, string | string[] | undefined>;

export async function PersonalCoachingPage({
  tenantSlug,
  searchParams,
}: {
  tenantSlug: string;
  searchParams: SearchParams;
}) {
  const { supabase, tenant } = await requireAdminUser(tenantSlug);
  const difficulty = searchParams.difficulty === "beginner" || searchParams.difficulty === "intermediate" || searchParams.difficulty === "advanced"
    ? searchParams.difficulty : "all";
  const mobileVisibility = searchParams.mobileVisibility === "public" || searchParams.mobileVisibility === "members_only" || searchParams.mobileVisibility === "private"
    ? searchParams.mobileVisibility : "all";
  const deliveryMode = searchParams.deliveryMode === "fixed_date" || searchParams.deliveryMode === "cohort_based"
    ? searchParams.deliveryMode : "all";
  const filters = { difficulty, mobileVisibility, deliveryMode } as const;

  // Apply the same classification as billing before paginating the personal list.
  const firstBatch = await getAdminProgramsPage(supabase, tenant.id, { ...filters, page: 1, pageSize: 50 });
  const programs = firstBatch.items.filter((program) => isPersonalHyroxProgram(program.title));
  for (let page = 2; page <= firstBatch.totalPages; page++) {
    const batch = await getAdminProgramsPage(supabase, tenant.id, { ...filters, page, pageSize: 50 });
    programs.push(...batch.items.filter((program) => isPersonalHyroxProgram(program.title)));
  }

  const requestedSize = Number(searchParams.pageSize);
  const pageSize = [10, 20, 50].includes(requestedSize) ? requestedSize : 20;
  const totalPages = Math.max(1, Math.ceil(programs.length / pageSize));
  const requestedPage = Number(searchParams.page);
  const page = Number.isFinite(requestedPage)
    ? Math.min(totalPages, Math.max(1, Math.floor(requestedPage))) : 1;

  return (
    <AdminPageShell title="프로그램 관리" description="개인 코칭 프로그램을 모아 보고 기간과 내용을 관리합니다.">
      <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
        회원 이름으로 프로그램명을 자동 생성하고, 구매 멤버 공개·고정 날짜·공통 이미지를 적용합니다.
      </p>
      <ProgramsList
        personalCoaching
        programs={programs.slice((page - 1) * pageSize, page * pageSize)}
        total={programs.length}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        {...filters}
      />
    </AdminPageShell>
  );
}
