"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProgramSessionReviewFeedbackAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import type {
  AdminProgramSessionReviewDateSummary,
  AdminProgramSessionReviewRow,
  ProgramSessionReviewStatus,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type CalendarViewMode = "week" | "month";

type SessionReviewsManagerProps = {
  items: AdminProgramSessionReviewRow[];
  summaries: AdminProgramSessionReviewDateSummary[];
  selectedDate: string;
  view: CalendarViewMode;
  month: string;
  rangeStart: string;
  rangeEnd: string;
};

const reviewStatusLabel: Record<ProgramSessionReviewStatus, string> = {
  submitted: "미답변",
  reviewed: "답변 완료",
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function addMonths(monthKey: string, months: number) {
  const [yearText, monthText] = monthKey.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1 + months, 1, 12);
  return toDateKey(date).slice(0, 7);
}

function startOfWeek(dateKey: string) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() - date.getDay());
  return toDateKey(date);
}

function getWeekDates(dateKey: string) {
  const weekStart = startOfWeek(dateKey);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function getMonthGridDates(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const firstOfMonth = new Date(Number(yearText), Number(monthText) - 1, 1, 12);
  const firstGridDate = new Date(firstOfMonth);
  firstGridDate.setDate(firstGridDate.getDate() - firstOfMonth.getDay());
  const firstGridDateKey = toDateKey(firstGridDate);

  return Array.from({ length: 42 }, (_, index) => addDays(firstGridDateKey, index));
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(fromDateKey(dateKey));
}

function formatMonthLabel(monthKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(fromDateKey(`${monthKey}-01`));
}

function getInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : "회";
}

function getSessionTypeLabel(value: AdminProgramSessionReviewRow["session_type"]) {
  return value === "rest" ? "휴식" : "트레이닝";
}

function getDateCountLabel(summary: AdminProgramSessionReviewDateSummary | undefined) {
  if (!summary?.totalCount) {
    return "";
  }

  if (summary.submittedCount > 0) {
    return `${summary.submittedCount}/${summary.totalCount}`;
  }

  return `${summary.totalCount}`;
}

function ReviewDateButton({
  dateKey,
  selectedDate,
  currentMonth,
  summary,
  compact = false,
  onSelect,
}: {
  dateKey: string;
  selectedDate: string;
  currentMonth?: string;
  summary: AdminProgramSessionReviewDateSummary | undefined;
  compact?: boolean;
  onSelect: (dateKey: string) => void;
}) {
  const date = fromDateKey(dateKey);
  const isSelected = dateKey === selectedDate;
  const isToday = dateKey === toDateKey(new Date());
  const isOutsideMonth = Boolean(currentMonth && !dateKey.startsWith(currentMonth));
  const hasPending = (summary?.submittedCount ?? 0) > 0;
  const countLabel = getDateCountLabel(summary);

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={cn(
        "relative flex min-h-20 flex-col items-start rounded-md border px-3 py-2 text-left transition hover:border-zinc-400 hover:bg-zinc-50",
        compact ? "min-h-16" : "min-h-24",
        isSelected ? "border-zinc-900 bg-zinc-900 text-white hover:border-zinc-900 hover:bg-zinc-900" : "border-zinc-200 bg-white",
        isOutsideMonth && !isSelected ? "text-zinc-300" : "text-zinc-900"
      )}
      aria-label={`${formatDateLabel(dateKey)} 선택`}
      aria-pressed={isSelected}
    >
      <span className={cn("text-xs", isSelected ? "text-zinc-200" : "text-zinc-500")}>{weekdayLabels[date.getDay()]}</span>
      <span className="mt-1 text-lg font-semibold leading-none">{date.getDate()}</span>
      <span className="mt-auto flex min-h-4 items-center gap-1.5 text-xs">
        {hasPending ? (
          <span className={cn("size-2 rounded-full", isSelected ? "bg-white" : "bg-rose-500")} aria-hidden="true" />
        ) : null}
        {countLabel ? <span className={cn(isSelected ? "text-zinc-100" : "text-zinc-500")}>{countLabel}</span> : null}
        {isToday ? <span className={cn(isSelected ? "text-zinc-100" : "text-zinc-500")}>오늘</span> : null}
      </span>
    </button>
  );
}

function ReviewListSection({
  title,
  emptyText,
  reviews,
  onSelect,
}: {
  title: string;
  emptyText: string;
  reviews: AdminProgramSessionReviewRow[];
  onSelect: (review: AdminProgramSessionReviewRow) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <Badge variant="outline">{reviews.length}건</Badge>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => onSelect(review)}
              className="w-full rounded-md border border-zinc-200 bg-white px-4 py-3 text-left transition hover:border-zinc-400 hover:bg-zinc-50"
            >
              <div className="flex gap-3">
                <Avatar className="size-9 border border-zinc-200">
                  <AvatarImage src={review.user_avatar_url ?? undefined} alt={`${review.user_name} 프로필`} />
                  <AvatarFallback>{getInitial(review.user_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-zinc-900">{review.user_name}</p>
                    <Badge variant={review.status === "reviewed" ? "default" : "secondary"}>{reviewStatusLabel[review.status]}</Badge>
                    <Badge variant="outline">{getSessionTypeLabel(review.session_type)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-700">{review.program_title} · {review.session_title}</p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">{review.completion_note}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>작성일 {formatAdminDateTime(review.created_at)}</span>
                    <span>피드백 {review.coach_feedback.trim() ? "작성됨" : "없음"}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function SessionReviewsManager({
  items,
  summaries,
  selectedDate,
  view,
  month,
  rangeStart,
  rangeEnd,
}: SessionReviewsManagerProps) {
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [selectedReview, setSelectedReview] = useState<AdminProgramSessionReviewRow | null>(null);
  const [coachFeedback, setCoachFeedback] = useState("");
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();

  const summaryByDate = useMemo(() => new Map(summaries.map((summary) => [summary.date, summary])), [summaries]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const monthDates = useMemo(() => getMonthGridDates(month), [month]);
  const submittedReviews = useMemo(() => items.filter((review) => review.status === "submitted"), [items]);
  const reviewedReviews = useMemo(() => items.filter((review) => review.status === "reviewed"), [items]);

  const selectedDateSummary = summaryByDate.get(selectedDate);
  const rangePendingCount = summaries.reduce((total, summary) => total + summary.submittedCount, 0);
  const rangeTotalCount = summaries.reduce((total, summary) => total + summary.totalCount, 0);

  const pushWithParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const nextQuery = params.toString();
    push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleSelectDate = (nextDate: string) => {
    pushWithParams({ date: nextDate, month: nextDate.slice(0, 7) });
  };

  const handleViewChange = (nextView: CalendarViewMode) => {
    pushWithParams({ view: nextView === "week" ? null : "month", month: nextView === "month" ? selectedDate.slice(0, 7) : null });
  };

  const handleWeekMove = (days: number) => {
    const nextDate = addDays(selectedDate, days);
    pushWithParams({ date: nextDate, month: nextDate.slice(0, 7) });
  };

  const handleMonthMove = (months: number) => {
    pushWithParams({ month: addMonths(month, months), view: "month" });
  };

  const handleToday = () => {
    const today = toDateKey(new Date());
    pushWithParams({ date: today, month: today.slice(0, 7) });
  };

  const handleDetailOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReview(null);
      setCoachFeedback("");
    }
  };

  const handleReviewSelect = (review: AdminProgramSessionReviewRow) => {
    setSelectedReview(review);
    setCoachFeedback(review.coach_feedback);
  };

  const handleSaveFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedReview) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("reviewId", selectedReview.id);
    formData.set("coachFeedback", coachFeedback);

    startTransition(async () => {
      const result = await updateProgramSessionReviewFeedbackAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedReview(null);
      setCoachFeedback("");
      router.refresh();
    });
  };

  const detailContent = selectedReview ? (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="space-y-6 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={selectedReview.status === "reviewed" ? "default" : "secondary"}>{reviewStatusLabel[selectedReview.status]}</Badge>
            <Badge variant="outline">{getSessionTypeLabel(selectedReview.session_type)}</Badge>
            <p className="text-xs text-zinc-500">작성일 {formatAdminDateTime(selectedReview.created_at)}</p>
          </div>

          <div className="grid gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-zinc-500">프로그램</p>
              <p className="mt-1 font-medium text-zinc-900">{selectedReview.program_title}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500">세션</p>
              <p className="mt-1 font-medium text-zinc-900">{selectedReview.session_title}</p>
              <p className="mt-1 text-xs text-zinc-500">{formatAdminDate(selectedReview.session_date)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900">회원 후기</h3>
            <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800">
              {selectedReview.completion_note}
            </div>
          </div>

          <form className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4" onSubmit={handleSaveFeedback}>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">코치 피드백</h3>
              <p className="text-xs text-zinc-500">저장하면 후기 상태가 답변 완료로 변경됩니다.</p>
            </div>

            <Textarea
              value={coachFeedback}
              onChange={(event) => setCoachFeedback(event.target.value.slice(0, 300))}
              rows={6}
              placeholder="회원의 운동 세션 후기에 대한 피드백을 남겨 주세요."
              required
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">{coachFeedback.length}/300</p>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {isPending ? "저장 중..." : "피드백 저장"}
              </Button>
            </div>
          </form>

          {selectedReview.reviewed_at ? (
            <div className="rounded-md border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
              {selectedReview.reviewed_by_name ? `${selectedReview.reviewed_by_name} · ` : ""}
              {formatAdminDateTime(selectedReview.reviewed_at)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-zinc-200 p-4 sm:px-6">
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => handleDetailOpenChange(false)}>
            닫기
          </Button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-md border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-zinc-500">선택 날짜</p>
            <h2 className="mt-1 text-lg font-semibold text-zinc-900">{formatDateLabel(selectedDate)}</h2>
            <p className="mt-1 text-xs text-zinc-500">
              {selectedDateSummary
                ? `전체 ${selectedDateSummary.totalCount}건 · 미답변 ${selectedDateSummary.submittedCount}건 · 답변 완료 ${selectedDateSummary.reviewedCount}건`
                : "등록된 운동 후기가 없습니다."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant={view === "week" ? "default" : "outline"} size="sm" onClick={() => handleViewChange("week")}>
              위클리
            </Button>
            <Button type="button" variant={view === "month" ? "default" : "outline"} size="sm" onClick={() => handleViewChange("month")}>
              먼슬리
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleToday}>
              오늘
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => (view === "week" ? handleWeekMove(-7) : handleMonthMove(-1))}
            aria-label={view === "week" ? "이전 주" : "이전 달"}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="text-center">
            <p className="text-sm font-medium text-zinc-900">{view === "week" ? `${formatAdminDate(rangeStart)} - ${formatAdminDate(rangeEnd)}` : formatMonthLabel(month)}</p>
            <p className="mt-1 text-xs text-zinc-500">표시 범위 전체 {rangeTotalCount}건 · 미답변 {rangePendingCount}건</p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => (view === "week" ? handleWeekMove(7) : handleMonthMove(1))}
            aria-label={view === "week" ? "다음 주" : "다음 달"}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {view === "week" ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {weekDates.map((dateKey) => (
              <ReviewDateButton
                key={dateKey}
                dateKey={dateKey}
                selectedDate={selectedDate}
                summary={summaryByDate.get(dateKey)}
                onSelect={handleSelectDate}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-500">
              {weekdayLabels.map((weekday) => (
                <div key={weekday} className="py-1">
                  {weekday}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDates.map((dateKey) => (
                <ReviewDateButton
                  key={dateKey}
                  dateKey={dateKey}
                  selectedDate={selectedDate}
                  currentMonth={month}
                  summary={summaryByDate.get(dateKey)}
                  compact
                  onSelect={handleSelectDate}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="space-y-5">
        <ReviewListSection
          title="미답변 후기"
          emptyText="이 날짜에는 미답변 운동 후기가 없습니다."
          reviews={submittedReviews}
          onSelect={handleReviewSelect}
        />
        <ReviewListSection
          title="답변 완료 후기"
          emptyText="이 날짜에는 답변 완료된 운동 후기가 없습니다."
          reviews={reviewedReviews}
          onSelect={handleReviewSelect}
        />
      </div>

      {isMobile ? (
        <Drawer open={Boolean(selectedReview)} onOpenChange={handleDetailOpenChange}>
          <DrawerContent className="max-h-[92vh] gap-0 p-0">
            <DrawerHeader className="border-b border-zinc-200 pr-12">
              <DrawerTitle>{selectedReview?.session_title ?? "운동 후기 상세"}</DrawerTitle>
              <DrawerDescription>
                {selectedReview ? `${selectedReview.user_name} · ${formatAdminDate(selectedReview.session_date)}` : ""}
              </DrawerDescription>
            </DrawerHeader>
            {detailContent}
            <DrawerFooter className="hidden" />
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedReview)} onOpenChange={handleDetailOpenChange}>
          <SheetContent className="w-full gap-0 p-0 sm:max-w-3xl">
            <SheetHeader className="border-b border-zinc-200 pr-12">
              <SheetTitle>{selectedReview?.session_title ?? "운동 후기 상세"}</SheetTitle>
              <SheetDescription>
                {selectedReview ? `${selectedReview.user_name} · ${formatAdminDate(selectedReview.session_date)}` : ""}
              </SheetDescription>
            </SheetHeader>
            {detailContent}
            <SheetFooter className="hidden" />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
