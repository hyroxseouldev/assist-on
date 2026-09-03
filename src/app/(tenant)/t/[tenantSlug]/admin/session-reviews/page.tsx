import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SessionReviewsManager } from "@/components/admin/session-reviews-manager";
import { getAdminProgramSessionReviewsCalendarData, requireAdminUser } from "@/lib/admin/server";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function parseDateKey(value: string | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  const date = fromDateKey(value);
  return Number.isNaN(date.getTime()) ? fallback : value;
}

function startOfWeek(dateKey: string) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() - date.getDay());
  return toDateKey(date);
}

function addDays(dateKey: string, days: number) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
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
  const { supabase, tenant, user, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug, { allowCoach: true });

  const today = toDateKey(new Date());
  const selectedDate = parseDateKey(typeof resolvedSearchParams.date === "string" ? resolvedSearchParams.date : undefined, today);
  const openReviewId = typeof resolvedSearchParams.reviewId === "string" ? resolvedSearchParams.reviewId : undefined;

  const weekStart = startOfWeek(selectedDate);
  const range = {
    rangeStart: weekStart,
    rangeEnd: addDays(weekStart, 6),
  };

  const reviews = await getAdminProgramSessionReviewsCalendarData(
    supabase,
    {
      tenantId: tenant.id,
      userId: user.id,
      isPlatformAdmin,
      tenantRole,
    },
    {
      selectedDate,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      openReviewId,
    }
  );

  return (
    <AdminPageShell title="운동 후기" description="날짜별 회원 세션 후기를 조회하고 코치 피드백을 남깁니다.">
      <SessionReviewsManager
        key={`${selectedDate}-${openReviewId ?? "list"}`}
        items={reviews.items}
        pendingItems={reviews.pendingItems}
        summaries={reviews.summaries}
        selectedDate={selectedDate}
        todayDate={today}
        openReviewId={openReviewId}
        rangeStart={reviews.rangeStart}
        rangeEnd={reviews.rangeEnd}
      />
    </AdminPageShell>
  );
}
