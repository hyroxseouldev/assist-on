import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SessionReviewsManager } from "@/components/admin/session-reviews-manager";
import { getAdminProgramSessionReviewsCalendarData, requireAdminUser } from "@/lib/admin/server";

type CalendarViewMode = "week" | "month";

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

function parseViewMode(value: string | undefined): CalendarViewMode {
  return value === "month" ? "month" : "week";
}

function parseMonthKey(value: string | undefined, fallbackDateKey: string) {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }

  return fallbackDateKey.slice(0, 7);
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

function getMonthRange(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(year, monthIndex, 1, 12);
  const end = new Date(year, monthIndex + 1, 0, 12);

  return {
    rangeStart: toDateKey(start),
    rangeEnd: toDateKey(end),
  };
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

  const today = toDateKey(new Date());
  const selectedDate = parseDateKey(typeof resolvedSearchParams.date === "string" ? resolvedSearchParams.date : undefined, today);
  const view = parseViewMode(typeof resolvedSearchParams.view === "string" ? resolvedSearchParams.view : undefined);
  const month = parseMonthKey(typeof resolvedSearchParams.month === "string" ? resolvedSearchParams.month : undefined, selectedDate);

  const weekStart = startOfWeek(selectedDate);
  const range =
    view === "month"
      ? getMonthRange(month)
      : {
          rangeStart: weekStart,
          rangeEnd: addDays(weekStart, 6),
        };

  const reviews = await getAdminProgramSessionReviewsCalendarData(supabase, tenantSlug, {
    selectedDate,
    rangeStart: range.rangeStart,
    rangeEnd: range.rangeEnd,
  });

  return (
    <AdminPageShell title="운동 후기" description="날짜별 회원 세션 후기를 조회하고 코치 피드백을 남깁니다.">
      <SessionReviewsManager
        items={reviews.items}
        summaries={reviews.summaries}
        selectedDate={selectedDate}
        view={view}
        month={month}
        rangeStart={reviews.rangeStart}
        rangeEnd={reviews.rangeEnd}
      />
    </AdminPageShell>
  );
}
