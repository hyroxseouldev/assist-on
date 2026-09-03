"use client";

import { CheckCheck, ChevronLeft, ChevronRight, Clock, Inbox, Loader2, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProgramSessionReviewFeedbackAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import type {
  AdminProgramSessionReviewDateSummary,
  AdminProgramSessionReviewRow,
  AdminPendingProgramSessionReviewRow,
  CoachReaction,
  ProgramSessionReviewStatus,
} from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type SessionReviewsManagerProps = {
  items: AdminProgramSessionReviewRow[];
  pendingItems: AdminPendingProgramSessionReviewRow[];
  summaries: AdminProgramSessionReviewDateSummary[];
  selectedDate: string;
  todayDate: string;
  openReviewId?: string;
  rangeStart: string;
  rangeEnd: string;
};

const reviewStatusLabel: Record<ProgramSessionReviewStatus, string> = {
  submitted: "미답변",
  reviewed: "답변 완료",
};

const coachReactionOptions: Array<{ value: CoachReaction; label: string }> = [
  { value: "good", label: "👍 잘했어요!" },
  { value: "great", label: "👏 참 잘했어요!" },
  { value: "excellent", label: "🔥 오늘 최고!" },
  { value: "consistent", label: "💪 꾸준함 멋져요" },
  { value: "needs_recovery", label: "🌿 푹 쉬어가요" },
];

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

function formatNullableBoolean(value: boolean | null | undefined) {
  if (value === true) return "네";
  if (value === false) return "아니오";
  return "미응답";
}

function formatNullableText(value: string | null | undefined) {
  return value?.trim() || "미응답";
}

function formatReviewMetric(value: number | null, suffix: string) {
  return value == null ? "미입력" : `${value}${suffix}`;
}

function formatRelativeReviewTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "어제";
  if (diffDays < 14) return `${diffDays}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
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
  todayDate,
  summary,
  onSelect,
}: {
  dateKey: string;
  selectedDate: string;
  todayDate: string;
  summary: AdminProgramSessionReviewDateSummary | undefined;
  onSelect: (dateKey: string) => void;
}) {
  const date = fromDateKey(dateKey);
  const isSelected = dateKey === selectedDate;
  const countLabel = getDateCountLabel(summary);
  const hasSubmittedReviews = Boolean(summary?.submittedCount);
  const hasPastSubmittedReviews = hasSubmittedReviews && dateKey < todayDate;
  const day = date.getDay();
  const weekendTextClass = day === 0 ? "text-red-600" : day === 6 ? "text-blue-600" : "text-zinc-950";
  const weekendMutedTextClass = day === 0 ? "text-red-500" : day === 6 ? "text-blue-500" : "text-zinc-500";

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={cn(
        "flex h-[84px] min-w-0 flex-col items-center justify-center rounded-md px-1 py-2.5 text-center transition hover:bg-zinc-100/70",
        isSelected ? "bg-zinc-200 hover:bg-zinc-200" : "bg-transparent"
      )}
      aria-label={`${formatDateLabel(dateKey)} 선택`}
      aria-pressed={isSelected}
    >
      <span className={cn("text-[11px] font-medium leading-none", weekendMutedTextClass)}>{weekdayLabels[day]}</span>
      <span className={cn("mt-2 flex items-center justify-center text-base font-semibold leading-none", weekendTextClass)}>
        {date.getDate()}
      </span>
      <span className={cn("mt-2 min-h-4 text-xs font-medium leading-none", hasPastSubmittedReviews ? "text-red-600" : hasSubmittedReviews ? "text-emerald-600" : "text-zinc-500")}>
        {countLabel}
      </span>
    </button>
  );
}

function getPendingAgeLabel(dateKey: string, todayDate: string) {
  const days = Math.max(0, Math.round((fromDateKey(todayDate).getTime() - fromDateKey(dateKey).getTime()) / 86_400_000));

  if (days === 0) return { label: "오늘", className: "bg-zinc-100 text-zinc-700", dotClassName: "bg-emerald-500" };
  if (days < 3) return { label: days === 1 ? "어제" : `${days}일 지남`, className: "bg-amber-100 text-amber-800", dotClassName: "bg-amber-500" };
  return { label: `${days}일 지남`, className: "bg-red-100 text-red-700", dotClassName: "bg-red-500" };
}

function PendingReviewListSection({
  title,
  emptyText,
  reviews,
  todayDate,
  onSelect,
}: {
  title: string;
  emptyText: string;
  reviews: AdminPendingProgramSessionReviewRow[];
  todayDate: string;
  onSelect: (review: AdminPendingProgramSessionReviewRow) => void;
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
        <div className="divide-y divide-zinc-200/70 border-y border-zinc-200/70 bg-transparent">
          {reviews.map((review) => {
            const age = getPendingAgeLabel(review.session_date, todayDate);

            return (
              <button
                key={review.id}
                type="button"
                onClick={() => onSelect(review)}
                className="flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-zinc-100/70 sm:px-2"
              >
                <div className="relative shrink-0">
                  <Avatar className="size-12 border border-zinc-200">
                    <AvatarImage src={review.user_avatar_url ?? undefined} alt={`${review.user_name} 프로필`} />
                    <AvatarFallback>{getInitial(review.user_name)}</AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute bottom-0 right-0 size-3 rounded-full border-2 border-white", age.dotClassName)} aria-label={`${age.label} 미답변`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <p className="shrink-0 truncate text-base font-semibold leading-6 text-zinc-950">{review.user_name}</p>
                      <p className="min-w-0 truncate text-xs font-medium leading-5 text-zinc-400">{review.program_title}</p>
                    </div>
                    <Badge className={cn("shrink-0 border-0", age.className)}>{age.label}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm leading-6 text-zinc-600">{review.completion_note}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
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
        <div className="divide-y divide-zinc-200/70 border-y border-zinc-200/70 bg-transparent">
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              onClick={() => onSelect(review)}
              className="flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-zinc-100/70 sm:px-2"
            >
              <div className="relative shrink-0">
                <Avatar className="size-12 border border-zinc-200">
                  <AvatarImage src={review.user_avatar_url ?? undefined} alt={`${review.user_name} 프로필`} />
                  <AvatarFallback>{getInitial(review.user_name)}</AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute bottom-0 right-0 size-3 rounded-full border-2 border-white",
                    review.status === "reviewed" ? "bg-zinc-400" : "bg-emerald-500"
                  )}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-baseline gap-2">
                    <p className="shrink-0 truncate text-base font-semibold leading-6 text-zinc-950">{review.user_name}</p>
                    <p className="min-w-0 truncate text-xs font-medium leading-5 text-zinc-400">{review.program_title}</p>
                  </div>
                  <p className="shrink-0 text-xs leading-6 text-zinc-500" suppressHydrationWarning>
                    {formatRelativeReviewTime(review.created_at)}
                  </p>
                </div>

                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                  {review.status === "reviewed" ? (
                    <CheckCheck className="size-4 shrink-0 text-emerald-500" aria-label="답변 완료" />
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-sm leading-6 text-zinc-600">{review.completion_note}</p>
                  {review.status === "submitted" ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-semibold text-white">
                      1
                    </span>
                  ) : null}
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
  pendingItems,
  summaries,
  selectedDate,
  todayDate,
  openReviewId,
  rangeStart,
  rangeEnd,
}: SessionReviewsManagerProps) {
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const initialReview = openReviewId ? items.find((item) => item.id === openReviewId) ?? null : null;
  const [selectedReview, setSelectedReview] = useState<AdminProgramSessionReviewRow | null>(initialReview);
  const [coachFeedback, setCoachFeedback] = useState(initialReview?.coach_feedback ?? "");
  const [coachReaction, setCoachReaction] = useState<CoachReaction | null>(initialReview?.coach_reaction ?? null);
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();
  const shouldShowHyroxProfile = tenantSlug !== "amor";

  const summaryByDate = useMemo(() => new Map(summaries.map((summary) => [summary.date, summary])), [summaries]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const reviewedReviews = useMemo(() => items.filter((review) => review.status === "reviewed"), [items]);
  const todayPendingReviews = useMemo(() => pendingItems.filter((review) => review.session_date === todayDate), [pendingItems, todayDate]);
  const pastPendingReviews = useMemo(() => pendingItems.filter((review) => review.session_date < todayDate), [pendingItems, todayDate]);
  const pastPendingSummaries = useMemo(
    () => summaries.filter((summary) => summary.date < todayDate && summary.submittedCount > 0),
    [summaries, todayDate]
  );
  const sanitizedSessionContentHtml = useMemo(
    () => (selectedReview ? sanitizeSessionContent(selectedReview.session_content_html) : ""),
    [selectedReview]
  );
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

  const getUrlWithParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  };

  const pushWithParams = (updates: Record<string, string | null>) => {
    push(getUrlWithParams(updates));
  };

  const replaceUrlWithoutNavigation = (updates: Record<string, string | null>) => {
    window.history.replaceState(null, "", getUrlWithParams(updates));
  };

  const handleSelectDate = (nextDate: string) => {
    pushWithParams({ date: nextDate, month: null, view: null, reviewId: null });
  };

  const handleWeekMove = (days: number) => {
    const nextDate = addDays(selectedDate, days);
    pushWithParams({ date: nextDate, month: null, view: null, reviewId: null });
  };

  const handleToday = () => {
    const today = toDateKey(new Date());
    pushWithParams({ date: today, month: null, view: null, reviewId: null });
  };

  const handleDetailOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReview(null);
      setCoachFeedback("");
      setCoachReaction(null);
      if (searchParams.has("reviewId")) {
        replaceUrlWithoutNavigation({ reviewId: null });
      }
    }
  };

  const handleReviewSelect = (review: AdminProgramSessionReviewRow) => {
    setSelectedReview(review);
    setCoachFeedback(review.coach_feedback);
    setCoachReaction(review.coach_reaction);
  };

  const handlePendingReviewSelect = (review: AdminPendingProgramSessionReviewRow) => {
    const detailedReview = review.session_date === selectedDate ? items.find((item) => item.id === review.id) : null;

    if (detailedReview) {
      handleReviewSelect(detailedReview);
      return;
    }

    pushWithParams({ date: review.session_date, reviewId: review.id });
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
    formData.set("coachReaction", coachReaction ?? "");

    startTransition(async () => {
      const result = await updateProgramSessionReviewFeedbackAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedReview(null);
      setCoachFeedback("");
      setCoachReaction(null);
      pushWithParams({ reviewId: null });
    });
  };

  const detailContent = selectedReview ? (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="space-y-6 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={selectedReview.status === "reviewed" ? "default" : "secondary"}>{reviewStatusLabel[selectedReview.status]}</Badge>
            <Badge variant="outline">{getSessionTypeLabel(selectedReview.session_type)}</Badge>
            <p className="text-xs text-zinc-500">작성일 {formatAdminDateTime(selectedReview.created_at)}</p>
          </div>

          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-xs font-medium text-zinc-500">프로그램</p>
              <p className="mt-1 font-medium text-zinc-900">{selectedReview.program_title}</p>
            </div>
          </div>

          <Accordion type="single" collapsible className="rounded-md border border-zinc-200 bg-zinc-50">
            <AccordionItem value="session-detail" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-zinc-900 hover:no-underline">
                <span className="min-w-0 truncate">세션 · {selectedReview.session_title}</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 border-t border-zinc-200 p-4">
                <div>
                  <p className="text-base font-semibold text-zinc-950">{selectedReview.session_title}</p>
                  <p className="mt-1 text-xs text-zinc-500">{formatAdminDate(selectedReview.session_date)}</p>
                </div>
                {sanitizedSessionContentHtml ? (
                  <article
                    className="prose prose-zinc max-w-none overflow-x-auto rounded-md border border-zinc-200 bg-white p-3 text-sm [&_img]:my-3 [&_img]:w-full [&_img]:rounded-lg [&_img]:object-cover"
                    dangerouslySetInnerHTML={{ __html: sanitizedSessionContentHtml }}
                  />
                ) : (
                  <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500">세션 본문이 없습니다.</div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {shouldShowHyroxProfile ? (
            <Accordion type="single" collapsible className="rounded-md border border-zinc-200 bg-zinc-50">
              <AccordionItem value="hyrox-profile" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-zinc-900 hover:no-underline">
                  하이록스 참가 정보
                </AccordionTrigger>
                <AccordionContent className="grid gap-3 border-t border-zinc-200 p-4 sm:grid-cols-2">
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">XON 멤버이신가요?</p>
                    <p className="mt-1 font-medium text-zinc-900">{formatNullableBoolean(selectedReview.hyrox_profile.is_xon_member)}</p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">하이록스 디비전</p>
                    <p className="mt-1 font-medium text-zinc-900">{formatNullableText(selectedReview.hyrox_profile.hyrox_division)}</p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">하이록스 출전 경험</p>
                    <p className="mt-1 font-medium text-zinc-900">
                      {formatNullableBoolean(selectedReview.hyrox_profile.has_hyrox_race_experience)}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">하이록스 목표</p>
                    <p className="mt-1 font-medium text-zinc-900">{formatNullableText(selectedReview.hyrox_profile.hyrox_goal)}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900">회원 후기</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-500">운동 강도</p>
                <p className="mt-1 font-medium text-zinc-900">{formatReviewMetric(selectedReview.intensity_rpe, "/10")}</p>
              </div>
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-medium text-zinc-500">평균 심박</p>
                <p className="mt-1 font-medium text-zinc-900">{formatReviewMetric(selectedReview.heart_rate_bpm, "bpm")}</p>
              </div>
            </div>
            <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white p-4 text-sm leading-6 text-zinc-800">
              {selectedReview.completion_note}
            </div>
          </div>

          <form id="program-session-review-feedback-form" className="space-y-3 rounded-md border border-zinc-200 bg-zinc-50 p-4" onSubmit={handleSaveFeedback}>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">코치 피드백</h3>
              <p className="text-xs text-zinc-500">저장하면 후기 상태가 답변 완료로 변경됩니다.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">빠른 리액션</p>
              <div className="flex flex-wrap gap-2">
                {coachReactionOptions.map((option) => {
                  const selected = coachReaction === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-zinc-950 bg-zinc-950 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
                      )}
                      aria-pressed={selected}
                      onClick={() => setCoachReaction((current) => (current === option.value ? null : option.value))}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Textarea
              value={coachFeedback}
              onChange={(event) => setCoachFeedback(event.target.value.slice(0, 300))}
              rows={6}
              placeholder={`예시 1
오늘 미션 수행 정말 잘해주셨어요! 기록/느낌을 보니 특히 ___ 부분이 좋았습니다. 다음에는 ___만 조금 더 신경써서 해볼게요.

예시 2
수고 많으셨습니다 :) 오늘은 ___가 인상적이었어요. 다만 ___ 구간에서는 조금 조절해주시면 더 안정적으로 수행할 수 있을 것 같습니다.

예시 3
오늘 컨디션과 기록을 보면 ___ 부분은 잘 유지되고 있어요. 후반부에는 ___가 살짝 무너질 수 있으니, 다음에는 초반부터 너무 힘쓰지 않고 일정하게 가볼게요.`}
              required
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">{coachFeedback.length}/300</p>
              <Button type="submit" disabled={isPending} className="hidden sm:inline-flex">
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

      <div className="shrink-0 border-t border-zinc-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleDetailOpenChange(false)}>
            닫기
          </Button>
          {isMobile ? (
            <Button type="submit" form="program-session-review-feedback-form" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "저장 중..." : "피드백 저장"}
            </Button>
          ) : null}
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="max-w-full space-y-3 bg-transparent sm:max-w-[480px] sm:space-y-5 sm:p-4">
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
              todayDate={todayDate}
              summary={summaryByDate.get(dateKey)}
              onSelect={handleSelectDate}
            />
          ))}
        </div>
      </section>

      <section className="max-w-full rounded-lg border border-zinc-200 bg-white p-4 sm:max-w-[480px]">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            <Inbox className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-zinc-950">미답변 피드백 인박스</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">지난 후기부터 확인하고 바로 피드백을 남겨보세요.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-md bg-zinc-50 p-3">
            <p className="text-xs font-medium text-zinc-500">오늘 미답변</p>
            <p className="mt-1 text-lg font-semibold text-zinc-950">{todayPendingReviews.length}건</p>
          </div>
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-xs font-medium text-red-700">지난 미답변</p>
            <p className="mt-1 text-lg font-semibold text-red-700">{pastPendingReviews.length}건</p>
          </div>
        </div>
        {pastPendingSummaries.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pastPendingSummaries.map((summary) => (
              <Button
                key={summary.date}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => handleSelectDate(summary.date)}
              >
                {weekdayLabels[fromDateKey(summary.date).getDay()]} {summary.submittedCount}건
              </Button>
            ))}
          </div>
        ) : null}
      </section>

      <Tabs key={selectedDate} defaultValue="pending" className="w-full max-w-full gap-4 sm:max-w-[480px]">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="pending" className="gap-2 px-3">
            <span>미답변 전체</span>
            <Badge variant="secondary">{pendingItems.length}건</Badge>
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2 px-3">
            <span>오늘</span>
            <Badge variant="secondary">{todayPendingReviews.length}건</Badge>
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="gap-2 px-3">
            <span>답변 완료</span>
            <Badge variant="secondary">{reviewedReviews.length}건</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingReviewListSection
            title="이번 주 미답변 후기"
            emptyText="이번 주에는 미답변 운동 후기가 없습니다."
            reviews={pendingItems}
            todayDate={todayDate}
            onSelect={handlePendingReviewSelect}
          />
        </TabsContent>
        <TabsContent value="today">
          <PendingReviewListSection
            title="오늘 미답변 후기"
            emptyText="오늘은 미답변 운동 후기가 없습니다."
            reviews={todayPendingReviews}
            todayDate={todayDate}
            onSelect={handlePendingReviewSelect}
          />
        </TabsContent>
        <TabsContent value="reviewed">
          <ReviewListSection
            title={`${formatDateLabel(selectedDate)} 답변 완료 후기`}
            emptyText="이 날짜에는 답변 완료된 운동 후기가 없습니다."
            reviews={reviewedReviews}
            onSelect={handleReviewSelect}
          />
        </TabsContent>
      </Tabs>

      {isMobile ? (
        <Sheet open={Boolean(selectedReview)} onOpenChange={handleDetailOpenChange}>
          <SheetContent side="bottom" showCloseButton={false} className="h-[100dvh] max-h-none w-full gap-0 rounded-none border-0 p-0">
            <SheetHeader className="shrink-0 border-b border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle>{selectedReview?.session_title ?? "운동 후기 상세"}</SheetTitle>
                  <SheetDescription className="mt-1">
                    {selectedReview ? `${selectedReview.user_name} · ${formatAdminDate(selectedReview.session_date)}` : ""}
                  </SheetDescription>
                </div>
                <Button type="button" variant="ghost" size="icon" className="-mr-2 -mt-1 shrink-0" onClick={() => handleDetailOpenChange(false)} aria-label="후기 상세 닫기">
                  <X className="size-5" />
                </Button>
              </div>
            </SheetHeader>
            {detailContent}
          </SheetContent>
        </Sheet>
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
