import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramsList } from "@/components/admin/programs-list";
import { getAdminProgramsPage, requireAdminUser } from "@/lib/admin/server";
import type {
  AdminProgramDeliveryModeFilter,
  AdminProgramDifficultyFilter,
  AdminProgramMobileVisibilityFilter,
} from "@/lib/admin/types";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseDifficultyFilter(value: string | undefined): AdminProgramDifficultyFilter {
  if (value === "beginner" || value === "intermediate" || value === "advanced") return value;
  return "all";
}

function parseMobileVisibilityFilter(value: string | undefined): AdminProgramMobileVisibilityFilter {
  if (value === "public" || value === "members_only" || value === "private") return value;
  return "all";
}

function parseDeliveryModeFilter(value: string | undefined): AdminProgramDeliveryModeFilter {
  if (value === "fixed_date" || value === "cohort_based") return value;
  return "all";
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
  const { supabase, tenant } = await requireAdminUser(tenantSlug);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const difficulty = parseDifficultyFilter(typeof resolvedSearchParams.difficulty === "string" ? resolvedSearchParams.difficulty : undefined);
  const mobileVisibility = parseMobileVisibilityFilter(
    typeof resolvedSearchParams.mobileVisibility === "string" ? resolvedSearchParams.mobileVisibility : undefined
  );
  const deliveryMode = parseDeliveryModeFilter(
    typeof resolvedSearchParams.deliveryMode === "string" ? resolvedSearchParams.deliveryMode : undefined
  );
  const programs = await getAdminProgramsPage(supabase, tenant.id, { page, pageSize, difficulty, mobileVisibility, deliveryMode });

  return (
    <AdminPageShell title="프로그램" description="프로그램을 생성하고 기간/설명을 관리합니다.">
      <ProgramsList
        programs={programs.items}
        total={programs.total}
        page={programs.page}
        pageSize={programs.pageSize}
        totalPages={programs.totalPages}
        difficulty={difficulty}
        mobileVisibility={mobileVisibility}
        deliveryMode={deliveryMode}
      />
    </AdminPageShell>
  );
}
