"use client";

import {
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProgramSessionReviewFeedbackAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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

function getSessionTypeLabel(
  value: AdminProgramSessionReviewRow["session_type"],
) {
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

function getDateCountLabel(
  summary: AdminProgramSessionReviewDateSummary | undefined,
) {
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
  const weekendTextClass =
    day === 0 ? "text-red-600" : day === 6 ? "text-blue-600" : "text-zinc-950";
  const weekendMutedTextClass =
    day === 0 ? "text-red-500" : day === 6 ? "text-blue-500" : "text-zinc-500";

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      className={cn(
        "flex h-[76px] min-w-0 flex-col items-center justify-center rounded-md px-1 py-2.5 text-center transition hover:bg-zinc-100/70",
        isSelected
          ? "bg-emerald-100/70 hover:bg-emerald-100"
          : "bg-transparent",
      )}
      aria-label={`${formatDateLabel(dateKey)} 선택`}
      aria-pressed={isSelected}
    >
      <span
        className={cn(
          "text-[11px] font-medium leading-none",
          weekendMutedTextClass,
        )}
      >
        {weekdayLabels[day]}
      </span>
      <span
        className={cn(
          "mt-2 flex items-center justify-center text-base font-semibold leading-none",
          weekendTextClass,
        )}
      >
        {date.getDate()}
      </span>
      <span
        className={cn(
          "mt-2 min-h-4 text-xs font-medium leading-none",
          hasPastSubmittedReviews
            ? "text-red-600"
            : hasSubmittedReviews
              ? "text-emerald-600"
              : "text-zinc-500",
        )}
      >
        {countLabel}
      </span>
    </button>
  );
}

function getPendingAgeLabel(dateKey: string, todayDate: string) {
  const days = Math.max(
    0,
    Math.round(
      (fromDateKey(todayDate).getTime() - fromDateKey(dateKey).getTime()) /
        86_400_000,
    ),
  );

  if (days === 0)
    return {
      label: "오늘",
      className: "bg-zinc-100 text-zinc-700",
      dotClassName: "bg-emerald-500",
    };
  if (days < 3)
    return {
      label: days === 1 ? "어제" : `${days}일 지남`,
      className: "bg-amber-100 text-amber-800",
      dotClassName: "bg-amber-500",
    };
  return {
    label: `${days}일 지남`,
    className: "bg-red-100 text-red-700",
    dotClassName: "bg-red-500",
  };
}

function PendingReviewListSection({
  title,
  emptyText,
  reviews,
  todayDate,
  onSelect,
  selectedId,
  disabled,
}: {
  title: string;
  emptyText: string;
  reviews: AdminPendingProgramSessionReviewRow[];
  todayDate: string;
  onSelect: (review: AdminPendingProgramSessionReviewRow) => void;
  selectedId?: string;
  disabled: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <Badge variant="outline">{reviews.length}건</Badge>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          {emptyText}
        </p>
      ) : (
        <div className="divide-y divide-zinc-200/70 border-y border-zinc-200/70 bg-transparent">
          {reviews.map((review) => {
            const age = getPendingAgeLabel(review.session_date, todayDate);

            return (
              <button
                key={review.id}
                type="button"
                disabled={disabled}
                aria-pressed={selectedId === review.id}
                onClick={() => onSelect(review)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-4 text-left transition hover:bg-zinc-50 disabled:opacity-50",
                  selectedId === review.id &&
                    "bg-emerald-50 hover:bg-emerald-50",
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="size-12 border border-zinc-200">
                    <AvatarImage
                      src={review.user_avatar_url ?? undefined}
                      alt={`${review.user_name} 프로필`}
                    />
                    <AvatarFallback>
                      {getInitial(review.user_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={cn(
                      "absolute bottom-0 right-0 size-3 rounded-full border-2 border-white",
                      age.dotClassName,
                    )}
                    aria-label={`${age.label} 미답변`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="shrink-0 truncate text-base font-semibold leading-6 text-zinc-950">
                        {review.user_name}
                      </p>
                      <p className="min-w-0 truncate text-xs font-medium leading-5 text-zinc-400">
                        {review.program_title}
                      </p>
                    </div>
                    <Badge className={cn("shrink-0 border-0", age.className)}>
                      {age.label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm leading-6 text-zinc-600">
                    {review.completion_note}
                  </p>
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
  selectedId,
  disabled,
}: {
  title: string;
  emptyText: string;
  reviews: AdminProgramSessionReviewRow[];
  onSelect: (review: AdminProgramSessionReviewRow) => void;
  selectedId?: string;
  disabled: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <Badge variant="outline">{reviews.length}건</Badge>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
          {emptyText}
        </p>
      ) : (
        <div className="divide-y divide-zinc-200/70 border-y border-zinc-200/70 bg-transparent">
          {reviews.map((review) => (
            <button
              key={review.id}
              type="button"
              disabled={disabled}
              aria-pressed={selectedId === review.id}
              onClick={() => onSelect(review)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2 py-4 text-left transition hover:bg-zinc-50 disabled:opacity-50",
                selectedId === review.id && "bg-emerald-50 hover:bg-emerald-50",
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="size-12 border border-zinc-200">
                  <AvatarImage
                    src={review.user_avatar_url ?? undefined}
                    alt={`${review.user_name} 프로필`}
                  />
                  <AvatarFallback>
                    {getInitial(review.user_name)}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute bottom-0 right-0 size-3 rounded-full border-2 border-white",
                    review.status === "reviewed"
                      ? "bg-zinc-400"
                      : "bg-emerald-500",
                  )}
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="shrink-0 truncate text-base font-semibold leading-6 text-zinc-950">
                      {review.user_name}
                    </p>
                    <p className="min-w-0 truncate text-xs font-medium leading-5 text-zinc-400">
                      {review.program_title}
                    </p>
                  </div>
                  <p
                    className="shrink-0 text-xs leading-6 text-zinc-500"
                    suppressHydrationWarning
                  >
                    {formatRelativeReviewTime(review.created_at)}
                  </p>
                </div>

                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                  {review.status === "reviewed" ? (
                    <CheckCheck
                      className="size-4 shrink-0 text-emerald-500"
                      aria-label="답변 완료"
                    />
                  ) : null}
                  <p className="min-w-0 flex-1 truncate text-sm leading-6 text-zinc-600">
                    {review.completion_note}
                  </p>
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
  rangeStart,
  rangeEnd,
}: SessionReviewsManagerProps) {
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [selectedReview, setSelectedReview] =
    useState<AdminProgramSessionReviewRow | null>(null);
  const [coachFeedback, setCoachFeedback] = useState("");
  const [coachReaction, setCoachReaction] = useState<CoachReaction | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"pending" | "today" | "reviewed">(
    "pending",
  );
  const { push } = useAdminNavigation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();
  const shouldShowHyroxProfile = tenantSlug !== "amor";

  const summaryByDate = useMemo(
    () => new Map(summaries.map((summary) => [summary.date, summary])),
    [summaries],
  );
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const selectedDateReviews = useMemo(
    () => items.filter((review) => review.session_date === selectedDate),
    [items, selectedDate],
  );
  const reviewedReviews = useMemo(
    () => selectedDateReviews.filter((review) => review.status === "reviewed"),
    [selectedDateReviews],
  );
  const selectedDatePendingReviews = useMemo(
    () => pendingItems.filter((review) => review.session_date === selectedDate),
    [pendingItems, selectedDate],
  );
  const todayPendingReviews = useMemo(
    () => pendingItems.filter((review) => review.session_date === todayDate),
    [pendingItems, todayDate],
  );
  const pastPendingReviews = useMemo(
    () => pendingItems.filter((review) => review.session_date < todayDate),
    [pendingItems, todayDate],
  );
  const pastPendingSummaries = useMemo(
    () =>
      summaries.filter(
        (summary) => summary.date < todayDate && summary.submittedCount > 0,
      ),
    [summaries, todayDate],
  );
  const sanitizedSessionContentHtml = useMemo(
    () =>
      selectedReview
        ? sanitizeSessionContent(selectedReview.session_content_html)
        : "",
    [selectedReview],
  );
  const weekSummary = useMemo(
    () =>
      summaries.reduce(
        (total, summary) => ({
          totalCount: total.totalCount + summary.totalCount,
          submittedCount: total.submittedCount + summary.submittedCount,
          reviewedCount: total.reviewedCount + summary.reviewedCount,
        }),
        { totalCount: 0, submittedCount: 0, reviewedCount: 0 },
      ),
    [summaries],
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
    if (isPending || !canDiscardFeedbackDraft()) return;
    push(getUrlWithParams(updates));
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

  const canDiscardFeedbackDraft = () => {
    const hasDraft =
      selectedReview &&
      (coachFeedback !== selectedReview.coach_feedback ||
        coachReaction !== selectedReview.coach_reaction);
    return (
      !hasDraft ||
      window.confirm("작성 중인 피드백이 저장되지 않았습니다. 닫으시겠어요?")
    );
  };

  const handleDetailOpenChange = (open: boolean) => {
    if (isPending) return;
    if (!open) {
      if (!canDiscardFeedbackDraft()) return;
      setSelectedReview(null);
      setCoachFeedback("");
      setCoachReaction(null);
    }
  };

  const handleReviewSelect = (review: AdminProgramSessionReviewRow) => {
    if (isPending) return;
    if (selectedReview?.id === review.id || !canDiscardFeedbackDraft()) return;
    setSelectedReview(review);
    setCoachFeedback(review.coach_feedback);
    setCoachReaction(review.coach_reaction);
  };

  const handlePendingReviewSelect = (
    review: AdminPendingProgramSessionReviewRow,
  ) => {
    const detailedReview = items.find((item) => item.id === review.id);

    if (detailedReview) {
      handleReviewSelect(detailedReview);
    }
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
      router.refresh();
    });
  };

  const detailContent = selectedReview ? (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={
                selectedReview.status === "reviewed" ? "default" : "secondary"
              }
            >
              {reviewStatusLabel[selectedReview.status]}
            </Badge>
            <Badge variant="outline">
              {getSessionTypeLabel(selectedReview.session_type)}
            </Badge>
            <p className="text-xs text-zinc-500">
              작성일 {formatAdminDateTime(selectedReview.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
            <Avatar className="size-12 border border-zinc-100">
              <AvatarImage
                src={selectedReview.user_avatar_url ?? undefined}
                alt=""
              />
              <AvatarFallback>
                {getInitial(selectedReview.user_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-950">
                {selectedReview.user_name}
              </p>
              <p className="mt-1 break-words text-xs text-zinc-500">
                {selectedReview.program_title}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900">회원 후기</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-zinc-500">운동 강도</p>
                <p className="text-xs font-medium text-zinc-900">
                  {formatReviewMetric(selectedReview.intensity_rpe, "/10")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-zinc-500">평균 심박</p>
                <p className="text-xs font-medium text-zinc-900">
                  {formatReviewMetric(selectedReview.heart_rate_bpm, "bpm")}
                </p>
              </div>
            </div>
            <div className="whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-4 text-sm leading-6 text-zinc-800">
              {selectedReview.completion_note}
            </div>
          </div>

          <form
            id="program-session-review-feedback-form"
            className="space-y-4 border-t border-zinc-200 pt-5"
            onSubmit={handleSaveFeedback}
          >
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-zinc-900">
                코치 피드백
              </h3>
              <p className="text-xs text-zinc-500">
                저장하면 후기 상태가 답변 완료로 변경됩니다.
              </p>
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
                          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100",
                      )}
                      aria-pressed={selected}
                      disabled={isPending}
                      onClick={() =>
                        setCoachReaction((current) =>
                          current === option.value ? null : option.value,
                        )
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <Textarea
              aria-label="코치 피드백"
              disabled={isPending}
              maxLength={300}
              value={coachFeedback}
              onChange={(event) =>
                setCoachFeedback(event.target.value.slice(0, 300))
              }
              rows={4}
              placeholder="회원에게 전달할 피드백을 입력하세요. 잘한 점과 다음 운동에서 신경 쓸 부분을 구체적으로 알려주세요."
              required
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                {coachFeedback.length}/300
              </p>
            </div>
          </form>

          <Accordion
            type="single"
            collapsible
            className="rounded-md border border-zinc-200 bg-zinc-50"
          >
            <AccordionItem value="session-detail" className="border-b-0">
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-zinc-900 hover:no-underline">
                <span className="min-w-0 truncate">
                  세션 · {selectedReview.session_title}
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 border-t border-zinc-200 p-4">
                <div>
                  <p className="text-base font-semibold text-zinc-950">
                    {selectedReview.session_title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatAdminDate(selectedReview.session_date)}
                  </p>
                </div>
                {sanitizedSessionContentHtml ? (
                  <article
                    className="prose prose-zinc max-w-none overflow-x-auto rounded-md border border-zinc-200 bg-white p-3 text-sm [&_img]:my-3 [&_img]:w-full [&_img]:rounded-lg [&_img]:object-cover"
                    dangerouslySetInnerHTML={{
                      __html: sanitizedSessionContentHtml,
                    }}
                  />
                ) : (
                  <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm text-zinc-500">
                    세션 본문이 없습니다.
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {shouldShowHyroxProfile ? (
            <Accordion
              type="single"
              collapsible
              className="rounded-md border border-zinc-200 bg-zinc-50"
            >
              <AccordionItem value="hyrox-profile" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold text-zinc-900 hover:no-underline">
                  하이록스 참가 정보
                </AccordionTrigger>
                <AccordionContent className="grid gap-3 border-t border-zinc-200 p-4 sm:grid-cols-2">
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">XON 멤버이신가요?</p>
                    <p className="mt-1 font-medium text-zinc-900">
                      {formatNullableBoolean(
                        selectedReview.hyrox_profile.is_xon_member,
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">하이록스 디비전</p>
                    <p className="mt-1 font-medium text-zinc-900">
                      {formatNullableText(
                        selectedReview.hyrox_profile.hyrox_division,
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">하이록스 출전 경험</p>
                    <p className="mt-1 font-medium text-zinc-900">
                      {formatNullableBoolean(
                        selectedReview.hyrox_profile.has_hyrox_race_experience,
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border border-zinc-200 bg-white p-3">
                    <p className="text-xs text-zinc-500">하이록스 목표</p>
                    <p className="mt-1 font-medium text-zinc-900">
                      {formatNullableText(
                        selectedReview.hyrox_profile.hyrox_goal,
                      )}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}

          {selectedReview.reviewed_at ? (
            <div className="order-4 rounded-md border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
              {selectedReview.reviewed_by_name
                ? `${selectedReview.reviewed_by_name} · `
                : ""}
              {formatAdminDateTime(selectedReview.reviewed_at)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDetailOpenChange(false)}
          >
            닫기
          </Button>
          <Button
            type="submit"
            form="program-session-review-feedback-form"
            disabled={isPending}
            className="bg-emerald-700 text-white hover:bg-emerald-800"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "저장 중..." : "피드백 저장"}
          </Button>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="mt-1 text-sm font-semibold leading-5 text-zinc-900 sm:text-lg">
              {formatDateLabel(selectedDate)}
            </h2>
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Clock
              className="size-3.5 shrink-0 text-zinc-500"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-4 text-zinc-950">
                {formatWeekRangeLabel(rangeStart, rangeEnd)}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
                전체 {weekSummary.totalCount}건 · 미답변{" "}
                {weekSummary.submittedCount}건 · 답변 완료{" "}
                {weekSummary.reviewedCount}건
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
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-1.5 text-xs font-semibold text-zinc-950"
                onClick={handleToday}
              >
                이번 주
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleWeekMove(7)}
                aria-label="다음 주"
                className="size-7"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-7 divide-x divide-zinc-100 border-t border-zinc-100 pt-2">
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

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="min-w-0 space-y-4 rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
          <section
            className="rounded-lg bg-zinc-50 p-3"
            aria-label="미답변 피드백 요약"
          >
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-2">
                <p className="font-medium text-zinc-500">오늘 미답변</p>
                <p className="font-semibold text-zinc-950">
                  {todayPendingReviews.length}건
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-red-700">지난 미답변</p>
                <p className="font-semibold text-red-700">
                  {pastPendingReviews.length}건
                </p>
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
                    {weekdayLabels[fromDateKey(summary.date).getDay()]}{" "}
                    {summary.submittedCount}건
                  </Button>
                ))}
              </div>
            ) : null}
          </section>

          <Tabs
            value={activeTab}
            onValueChange={(tab) => {
              if (tab === "pending" || tab === "today" || tab === "reviewed") {
                if (isPending || !canDiscardFeedbackDraft()) return;
                setSelectedReview(null);
                setCoachFeedback("");
                setCoachReaction(null);
                setActiveTab(tab);
              }
            }}
            className="min-w-0 gap-4"
          >
            <TabsList className="h-auto w-full rounded-none border-b border-zinc-200 bg-transparent p-0">
              <TabsTrigger
                value="pending"
                disabled={isPending}
                className="min-w-0 gap-1 rounded-none border-0 border-b-2 border-transparent px-1 py-3 text-xs data-[state=active]:border-emerald-700 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none sm:text-sm"
              >
                <span>미답변 전체</span>
                <Badge variant="secondary">{pendingItems.length}건</Badge>
              </TabsTrigger>
              <TabsTrigger
                value="today"
                disabled={isPending}
                className="min-w-0 gap-1 rounded-none border-0 border-b-2 border-transparent px-1 py-3 text-xs data-[state=active]:border-emerald-700 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none sm:text-sm"
              >
                <span>{selectedDate === todayDate ? "오늘" : "선택일"}</span>
                <Badge variant="secondary">
                  {selectedDatePendingReviews.length}건
                </Badge>
              </TabsTrigger>
              <TabsTrigger
                value="reviewed"
                disabled={isPending}
                className="min-w-0 gap-1 rounded-none border-0 border-b-2 border-transparent px-1 py-3 text-xs data-[state=active]:border-emerald-700 data-[state=active]:text-emerald-800 data-[state=active]:shadow-none sm:text-sm"
              >
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
                selectedId={selectedReview?.id}
                disabled={isPending}
              />
            </TabsContent>
            <TabsContent value="today">
              <PendingReviewListSection
                title={`${formatDateLabel(selectedDate)} 미답변 후기`}
                emptyText="선택한 날짜에는 미답변 운동 후기가 없습니다."
                reviews={selectedDatePendingReviews}
                todayDate={todayDate}
                onSelect={handlePendingReviewSelect}
                selectedId={selectedReview?.id}
                disabled={isPending}
              />
            </TabsContent>
            <TabsContent value="reviewed">
              <ReviewListSection
                title={`${formatDateLabel(selectedDate)} 답변 완료 후기`}
                emptyText="이 날짜에는 답변 완료된 운동 후기가 없습니다."
                reviews={reviewedReviews}
                onSelect={handleReviewSelect}
                selectedId={selectedReview?.id}
                disabled={isPending}
              />
            </TabsContent>
          </Tabs>
        </div>

        {!isMobile ? (
          <section
            className="flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white lg:sticky lg:top-4 lg:h-[calc(100dvh-24rem)] lg:min-h-[32rem]"
            aria-label="피드백 상세"
          >
            <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
              <h2 className="font-semibold text-zinc-950">피드백 상세</h2>
            </div>
            {selectedReview ? (
              detailContent
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center p-6 text-center">
                <Inbox className="size-9 text-emerald-600" aria-hidden="true" />
                <h3 className="mt-4 font-semibold text-zinc-900">
                  확인할 후기를 선택하세요
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  목록에서 후기를 선택하면 운동 내용과
                  <br />
                  회원 후기를 확인하고 바로 답변할 수 있습니다.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>

      {isMobile ? (
        <Sheet
          open={Boolean(selectedReview)}
          onOpenChange={handleDetailOpenChange}
        >
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="h-[100dvh] max-h-none w-full gap-0 rounded-none border-0 p-0"
          >
            <SheetHeader className="shrink-0 border-b border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle>
                    {selectedReview?.session_title ?? "운동 후기 상세"}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    {selectedReview
                      ? `${selectedReview.user_name} · ${formatAdminDate(selectedReview.session_date)}`
                      : ""}
                  </SheetDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-mr-2 -mt-1 shrink-0"
                  onClick={() => handleDetailOpenChange(false)}
                  aria-label="후기 상세 닫기"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </SheetHeader>
            {detailContent}
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
