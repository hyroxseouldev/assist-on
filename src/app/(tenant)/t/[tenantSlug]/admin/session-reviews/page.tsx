import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SessionReviewsManager } from "@/components/admin/session-reviews-manager";
import { getAdminProgramSessionReviewsPage, getTenantSessionPrograms, requireAdminUser } from "@/lib/admin/server";
import type { ProgramSessionReviewStatus } from "@/lib/admin/types";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseReviewStatus(value: string | undefined): ProgramSessionReviewStatus | "all" {
  if (value === "submitted" || value === "reviewed") {
    return value;
  }

  return "all";
}

export default async function TenantAdminSessionReviewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);

  const programs = await getTenantSessionPrograms(supabase, tenantSlug);
  const date = typeof resolvedSearchParams.date === "string" ? resolvedSearchParams.date : toDateKey(new Date());
  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "";
  const status = parseReviewStatus(typeof resolvedSearchParams.reviewStatus === "string" ? resolvedSearchParams.reviewStatus : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const programIdParam = typeof resolvedSearchParams.programId === "string" ? resolvedSearchParams.programId : "";
  const selectedProgramId = programIdParam && programs.some((program) => program.id === programIdParam) ? programIdParam : "";

  const reviews = await getAdminProgramSessionReviewsPage(supabase, tenantSlug, {
    status,
    query,
    page,
    pageSize,
    date,
    programId: selectedProgramId || undefined,
  });

  return (
    <AdminPageShell title="운동 후기" description="날짜별 회원 세션 후기를 조회하고 코치 피드백을 남깁니다.">
      <SessionReviewsManager
        items={reviews.items}
        total={reviews.total}
        page={reviews.page}
        pageSize={reviews.pageSize}
        totalPages={reviews.totalPages}
        query={query}
        status={status}
        selectedDate={date}
        selectedProgramId={selectedProgramId}
        programs={programs}
      />
    </AdminPageShell>
  );
}
