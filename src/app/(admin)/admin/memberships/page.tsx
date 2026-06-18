import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { MembershipsList } from "@/components/admin/memberships-list";
import { getAdminMembershipsPage, getTenantSessionPrograms, requireAdminUser } from "@/lib/admin/server";
import type { AdminMembershipStatusFilter } from "@/lib/admin/types";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseMembershipStatus(value: string | undefined): AdminMembershipStatusFilter {
  if (value === "active" || value === "pending" || value === "expired" || value === "inactive") {
    return value;
  }

  return "all";
}

export default async function TenantAdminMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug, { allowCoach: true });

  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "";
  const programIdParam = typeof resolvedSearchParams.programId === "string" ? resolvedSearchParams.programId : "";
  const status = parseMembershipStatus(typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;

  const programs = await getTenantSessionPrograms(supabase, tenantSlug);
  const selectedProgramId = programIdParam && programs.some((program) => program.id === programIdParam) ? programIdParam : "";
  const memberships = await getAdminMembershipsPage(supabase, tenantSlug, {
    query,
    programId: selectedProgramId || null,
    status,
    page,
    pageSize,
  });

  return (
    <AdminPageShell title="멤버쉽 현황" description="회원별 프로그램 멤버쉽 이력을 조회합니다.">
      <MembershipsList
        memberships={memberships.items}
        total={memberships.total}
        page={memberships.page}
        pageSize={memberships.pageSize}
        totalPages={memberships.totalPages}
        query={query}
        selectedProgramId={selectedProgramId}
        status={status}
        programs={programs}
      />
    </AdminPageShell>
  );
}
