"use client";

import { CalendarIcon, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { updateProgramSessionReviewFeedbackAction } from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { formatAdminDate, formatAdminDateTime } from "@/lib/admin/format";
import type { AdminProgramSessionReviewRow, ProgramSessionReviewStatus } from "@/lib/admin/types";

type SessionReviewsManagerProps = {
  items: AdminProgramSessionReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  status: ProgramSessionReviewStatus | "all";
  selectedDate: string;
  selectedProgramId: string;
  programs: Array<{ id: string; label: string; thumbnailUrl: string | null }>;
};

const reviewStatusLabel: Record<ProgramSessionReviewStatus, string> = {
  submitted: "미답변",
  reviewed: "답변 완료",
};

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function ReviewDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start text-left font-normal">
          <CalendarIcon className="mr-2 size-4" />
          {formatDateLabel(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={fromDateKey(value)}
          onSelect={(date) => {
            if (date) {
              onChange(toDateKey(date));
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export function SessionReviewsManager({
  items,
  total,
  page,
  pageSize,
  totalPages,
  query,
  status,
  selectedDate,
  selectedProgramId,
  programs,
}: SessionReviewsManagerProps) {
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);
  const [dateValue, setDateValue] = useState(selectedDate);
  const [selectedReview, setSelectedReview] = useState<AdminProgramSessionReviewRow | null>(null);
  const [coachFeedback, setCoachFeedback] = useState("");
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    setDateValue(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedReview) {
      setCoachFeedback("");
      return;
    }

    setCoachFeedback(selectedReview.coach_feedback);
  }, [selectedReview]);

  const summaryText = useMemo(() => {
    if (total === 0) {
      return "선택한 조건에 해당하는 운동 후기가 없습니다.";
    }

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [page, pageSize, total]);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
  }, [page, totalPages]);

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

  const createPageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  };

  const handleSearch = () => {
    pushWithParams({ q: searchValue.trim() || null, page: "1" });
  };

  const handleDateChange = (nextDate: string) => {
    setDateValue(nextDate);
    pushWithParams({ date: nextDate, page: "1" });
  };

  const handleStatusChange = (nextStatus: string) => {
    pushWithParams({ reviewStatus: nextStatus, page: "1" });
  };

  const handleProgramChange = (nextProgramId: string) => {
    pushWithParams({ programId: nextProgramId === "all" ? null : nextProgramId, page: "1" });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  const handleDetailOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReview(null);
      setCoachFeedback("");
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

    startTransition(async () => {
      const result = await updateProgramSessionReviewFeedbackAction(formData);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setSelectedReview(null);
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

          <div className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
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
            <div className="rounded-xl border border-zinc-200 bg-white p-4 whitespace-pre-wrap text-sm leading-6 text-zinc-800">
              {selectedReview.completion_note}
            </div>
          </div>

          <form className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4" onSubmit={handleSaveFeedback}>
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
            <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs text-zinc-500">
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
    <div className="space-y-4">
      <div className="grid gap-2 xl:grid-cols-[1.2fr_220px_180px_220px_120px]">
        <div className="flex gap-2">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="회원명/세션/후기 검색"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button variant="outline" onClick={handleSearch}>
            검색
          </Button>
        </div>

        <Select value={selectedProgramId || "all"} onValueChange={handleProgramChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="프로그램 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 프로그램</SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            <SelectItem value="submitted">미답변</SelectItem>
            <SelectItem value="reviewed">답변 완료</SelectItem>
          </SelectContent>
        </Select>

        <ReviewDateField value={dateValue} onChange={handleDateChange} />

        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개</SelectItem>
            <SelectItem value="20">20개</SelectItem>
            <SelectItem value="50">50개</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-zinc-500">{summaryText}</p>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader className="bg-zinc-50 text-zinc-600">
              <TableRow>
                <TableHead className="px-3">회원</TableHead>
                <TableHead className="px-3">세션</TableHead>
                <TableHead className="px-3">후기</TableHead>
                <TableHead className="px-3">상태</TableHead>
                <TableHead className="px-3">피드백</TableHead>
                <TableHead className="px-3">작성일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="px-3 py-10 text-center text-zinc-500">
                    해당 날짜에 등록된 운동 후기가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((review) => (
                  <TableRow
                    key={review.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedReview(review)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedReview(review);
                      }
                    }}
                  >
                    <TableCell className="px-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 border border-zinc-200">
                          <AvatarImage src={review.user_avatar_url ?? undefined} alt={`${review.user_name} 프로필`} />
                          <AvatarFallback>{getInitial(review.user_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-zinc-900">{review.user_name}</p>
                          <p className="truncate text-xs text-zinc-500">{review.program_title}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <p className="font-medium text-zinc-900">{review.session_title}</p>
                      <p className="text-xs text-zinc-500">{formatAdminDate(review.session_date)}</p>
                    </TableCell>
                    <TableCell className="px-3">
                      <p className="line-clamp-2 max-w-[360px] text-sm text-zinc-700">{review.completion_note}</p>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={review.status === "reviewed" ? "default" : "secondary"}>{reviewStatusLabel[review.status]}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-xs text-zinc-600">
                      {review.coach_feedback.trim() ? "작성됨" : "없음"}
                    </TableCell>
                    <TableCell className="px-3 text-xs text-zinc-500">{formatAdminDateTime(review.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={createPageHref(Math.max(1, page - 1))}
              onClick={(event) => {
                if (page <= 1) {
                  event.preventDefault();
                }
              }}
              className={page <= 1 ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>

          {pageNumbers.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink href={createPageHref(pageNumber)} isActive={pageNumber === page}>
                {pageNumber}
              </PaginationLink>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href={createPageHref(Math.min(totalPages, page + 1))}
              onClick={(event) => {
                if (page >= totalPages) {
                  event.preventDefault();
                }
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

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
