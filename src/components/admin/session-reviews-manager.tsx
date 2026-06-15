"use client";

import { ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type SessionReviewsManagerProps = {
  items: AdminProgramSessionReviewRow[];
  summaries: AdminProgramSessionReviewDateSummary[];
  selectedDate: string;
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

function startOfWeek(dateKey: string) {
  const date = fromDateKey(dateKey);
  date.setDate(date.getDate() - date.getDay());
  return toDateKey(date);
}

function getWeekDates(dateKey: string) {
  const weekStart = startOfWeek(dateKey);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function formatDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(fromDateKey(dateKey));
}

function getInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : "회";
}

function getSessionTypeLabel(value: AdminProgramSessionReviewRow["session_type"]) {
  return value === "rest" ? "휴식" : "트레이닝";
}

function getDateCountLabel(summary: AdminProgramSessionReviewDateSummary | undefined) {
  return summary?.totalCount ? `${summary.totalCount}` : "";
}

function formatWeekRangeLabel(rangeStart: string, rangeEnd: string) {
  const start = fromDateKey(rangeStart);
  const end = fromDateKey(rangeEnd);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getDate()}일`;
  }

  if (sameYear) {
    return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getMonth() + 1}월 ${end.getDate()}일`;
  }

  return `${start.getFullYear()}년 ${start.getMonth() + 1}월 ${start.getDate()}일 - ${end.getFullYear()}년 ${
    end.getMonth() + 1
  }월 ${end.getDate()}일`;
}

function ReviewDateButton({
  dateKey,
  selectedDate,
  summary,
  onSelect,
}: {
  dateKey: string;
  selectedDate: string;
  summary: AdminProgramSessionReviewDateSummary | undefined;
  onSelect: (dateKey: string) => void;
}) {
  const date = fromDateKey(dateKey);
  const isSelected = dateKey === selectedDate;
  const countLabel = getDateCountLabel(summary);
  const day = date.getDay();
  const weekendTextClass = day === 0 ? "text-red-600" : day === 6 ? "text-blue-600" : "text-zinc-950";
  const weekendMutedTextClass = day === 0 ? "text-red-500" : day === 6 ? "text-blue-500" : "text-zinc-500";

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={cn(
        "flex h-[84px] min-w-0 flex-col items-center justify-center rounded-md px-1 py-2.5 text-center transition hover:bg-zinc-50",
        isSelected ? "bg-zinc-200 hover:bg-zinc-200" : "bg-white"
      )}
      aria-label={`${formatDateLabel(dateKey)} 선택`}
      aria-pressed={isSelected}
    >
      <span className={cn("text-[11px] font-medium leading-none", weekendMutedTextClass)}>{weekdayLabels[day]}</span>
      <span className={cn("mt-2 flex items-center justify-center text-base font-semibold leading-none", weekendTextClass)}>
        {date.getDate()}
      </span>
      <span className="mt-2 min-h-4 text-xs font-medium leading-none text-zinc-500">{countLabel}</span>
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
  const submittedReviews = useMemo(() => items.filter((review) => review.status === "submitted"), [items]);
  const reviewedReviews = useMemo(() => items.filter((review) => review.status === "reviewed"), [items]);
  const weekSummary = useMemo(
    () =>
      summaries.reduce(
        (total, summary) => ({
          totalCount: total.totalCount + summary.totalCount,
          submittedCount: total.submittedCount + summary.submittedCount,
          reviewedCount: total.reviewedCount + summary.reviewedCount,
        }),
        { totalCount: 0, submittedCount: 0, reviewedCount: 0 }
      ),
    [summaries]
  );

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
    pushWithParams({ date: nextDate, month: null, view: null });
  };

  const handleWeekMove = (days: number) => {
    const nextDate = addDays(selectedDate, days);
    pushWithParams({ date: nextDate, month: null, view: null });
  };

  const handleToday = () => {
    const today = toDateKey(new Date());
    pushWithParams({ date: today, month: null, view: null });
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
    <div className="space-y-4 sm:space-y-5">
      <section className="max-w-full space-y-3 bg-white sm:max-w-[480px] sm:space-y-5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] leading-none text-zinc-500 sm:text-xs">선택 날짜</p>
            <h2 className="mt-1 text-sm font-semibold leading-5 text-zinc-900 sm:text-lg">{formatDateLabel(selectedDate)}</h2>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <Clock className="size-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-4 text-zinc-950">{formatWeekRangeLabel(rangeStart, rangeEnd)}</p>
            <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
              전체 {weekSummary.totalCount}건 · 미답변 {weekSummary.submittedCount}건 · 답변 완료 {weekSummary.reviewedCount}건
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleWeekMove(-7)}
              aria-label="이전 주"
              className="size-7"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button type="button" variant="ghost" className="h-7 px-1.5 text-xs font-semibold text-zinc-950" onClick={handleToday}>
              이번 주
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => handleWeekMove(7)} aria-label="다음 주" className="size-7">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7">
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
      </section>

      <Tabs key={selectedDate} defaultValue="submitted" className="w-full max-w-full gap-4 sm:max-w-[480px]">
        <TabsList className="w-full justify-start sm:w-fit">
          <TabsTrigger value="submitted" className="gap-2 px-3">
            <span>미답변 후기</span>
            <Badge variant="secondary">{submittedReviews.length}건</Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="gap-2 px-3">
            <span>답변 완료</span>
            <Badge variant="secondary">{reviewedReviews.length}건</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submitted">
          <ReviewListSection
            title="미답변 후기"
            emptyText="이 날짜에는 미답변 운동 후기가 없습니다."
            reviews={submittedReviews}
            onSelect={handleReviewSelect}
          />
        </TabsContent>
        <TabsContent value="reviewed">
          <ReviewListSection
            title="답변 완료 후기"
            emptyText="이 날짜에는 답변 완료된 운동 후기가 없습니다."
            reviews={reviewedReviews}
            onSelect={handleReviewSelect}
          />
        </TabsContent>
      </Tabs>

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
