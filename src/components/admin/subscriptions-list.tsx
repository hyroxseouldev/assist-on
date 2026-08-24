"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminSubscriptionRow, AdminSubscriptionStatus, AdminSubscriptionStatusFilter } from "@/lib/admin/types";

type SubscriptionsListProps = {
  subscriptions: AdminSubscriptionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  status: AdminSubscriptionStatusFilter;
};

const statusOptions: Array<{ value: AdminSubscriptionStatusFilter; label: string }> = [
  { value: "all", label: "전체 상태" },
  { value: "active", label: "활성" },
  { value: "past_due", label: "결제 실패" },
  { value: "incomplete", label: "미완료" },
  { value: "canceled", label: "해지" },
];

function formatMoney(value: number | null, currency: string | null) {
  if (value === null) return "-";

  const normalizedCurrency = currency?.toUpperCase() || "KRW";
  if (normalizedCurrency === "KRW") {
    return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: normalizedCurrency,
  }).format(value / 100);
}

function formatProvider(value: string) {
  if (value === "toss") return "토스";
  if (value === "polar") return "Polar";
  return value || "-";
}

function getStatusMeta(status: AdminSubscriptionStatus) {
  if (status === "active") {
    return { label: "활성", variant: "default" as const, className: "border-emerald-300 bg-emerald-100 text-emerald-800" };
  }

  if (status === "past_due") {
    return { label: "결제 실패", variant: "destructive" as const, className: "border-rose-300 bg-rose-100 text-rose-800" };
  }

  if (status === "canceled") {
    return { label: "해지", variant: "outline" as const, className: "border-zinc-300 bg-zinc-100 text-zinc-700" };
  }

  return { label: "미완료", variant: "secondary" as const, className: "border-amber-300 bg-amber-100 text-amber-800" };
}

function formatCycleStatus(value: string | null) {
  if (value === "paid") return "성공";
  if (value === "failed") return "실패";
  if (value === "pending") return "대기";
  if (value === "canceled") return "취소";
  return "-";
}

function formatRecurringInterval(interval: string | null, count: number | null) {
  if (!interval) return "-";

  const normalizedCount = count && count > 1 ? `${count}` : "";
  if (interval === "month") return `${normalizedCount}개월마다`;
  if (interval === "year") return `${normalizedCount}년마다`;
  if (interval === "week") return `${normalizedCount}주마다`;
  if (interval === "day") return `${normalizedCount}일마다`;
  return normalizedCount ? `${normalizedCount} ${interval}` : interval;
}

function formatShortId(value: string | null) {
  if (!value) return "-";
  if (value.length <= 14) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export function SubscriptionsList({
  subscriptions,
  total,
  page,
  pageSize,
  totalPages,
  query,
  status,
}: SubscriptionsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(query);

  const summaryText = useMemo(() => {
    if (total === 0) return "선택한 조건의 구독이 없습니다.";

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
      if (value === null || value === "" || value === "all") {
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

  return (
    <div className="space-y-4">
      <div className="grid gap-2 lg:grid-cols-[1fr_170px_130px]">
        <div className="flex gap-2">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="회원명, 이메일, 휴대폰 번호, 상품 또는 프로그램 검색"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={handleSearch}>
            검색
          </Button>
        </div>

        <Select value={status} onValueChange={(nextStatus) => pushWithParams({ status: nextStatus, page: "1" })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={(nextPageSize) => pushWithParams({ pageSize: nextPageSize, page: "1" })}>
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

      <p className="text-sm text-zinc-500">{summaryText}</p>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">회원</TableHead>
              <TableHead className="px-3">상품/프로그램</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">금액</TableHead>
              <TableHead className="px-3">결제사</TableHead>
              <TableHead className="px-3">주기</TableHead>
              <TableHead className="px-3">현재 기간</TableHead>
              <TableHead className="px-3">다음 결제</TableHead>
              <TableHead className="px-3">최근 결제</TableHead>
              <TableHead className="px-3">최근 사이클</TableHead>
              <TableHead className="px-3">생성일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="px-3 py-8 text-center text-zinc-500">
                  선택한 조건의 구독이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => {
                const statusMeta = getStatusMeta(subscription.status);

                return (
                  <TableRow key={subscription.id}>
                    <TableCell className="px-3 text-zinc-900">
                      <div className="space-y-0.5">
                        <p className="font-medium">{subscription.user_name}</p>
                        <p className="text-xs text-zinc-500">{subscription.user_email || subscription.user_id}</p>
                        {subscription.user_phone_number ? <p className="text-xs text-zinc-500">{subscription.user_phone_number}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[280px] px-3 text-zinc-900">
                      <div className="space-y-0.5">
                        <p className="whitespace-normal font-medium">{subscription.program_title || "Polar 상품"}</p>
                        <p className="text-xs text-zinc-500">상품 {formatShortId(subscription.provider_product_id)}</p>
                        <p className="text-xs text-zinc-500">가격 {formatShortId(subscription.provider_price_id)}</p>
                        {subscription.provider_checkout_id ? (
                          <p className="text-xs text-zinc-500">체크아웃 {formatShortId(subscription.provider_checkout_id)}</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="space-y-1">
                        <Badge variant={statusMeta.variant} className={statusMeta.className}>
                          {statusMeta.label}
                        </Badge>
                        {subscription.cancel_at_period_end ? (
                          <p className="text-xs text-amber-700">기간 종료 후 해지</p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatMoney(subscription.amount, subscription.currency)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatProvider(subscription.provider)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      {formatRecurringInterval(subscription.recurring_interval, subscription.recurring_interval_count)}
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      <div className="space-y-0.5">
                        <p>{formatAdminDateTime(subscription.current_period_start_at)}</p>
                        <p className="text-xs text-zinc-500">{formatAdminDateTime(subscription.current_period_end_at)}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(subscription.next_billing_at)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(subscription.last_paid_at)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      <div className="space-y-0.5">
                        <p>{formatCycleStatus(subscription.latest_cycle_status)}</p>
                        <p className="text-xs text-zinc-500">
                          {formatAdminDateTime(subscription.latest_cycle_paid_at ?? subscription.latest_cycle_failed_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(subscription.created_at)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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
    </div>
  );
}
