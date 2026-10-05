"use client";

import { Eye } from "lucide-react";
import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ApproveBankTransferOrderButton } from "@/components/admin/approve-bank-transfer-order-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminProgramOrderFilter, AdminProgramOrderRow } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type ProgramOrdersListProps = {
  orders: AdminProgramOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminProgramOrderFilter;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPaymentMethod(value: string | null) {
  if (value === "bank_transfer") return "무통장";
  if (value === "toss_subscription") return "토스 구독";
  if (value === "toss_card") return "토스 카드";
  return "-";
}

function getStatusMeta(status: string) {
  if (status === "paid") {
    return { label: "입금 확인", variant: "default" as const, rowTone: "confirmed" as const };
  }

  if (status === "pending") {
    return { label: "입금 대기", variant: "secondary" as const, rowTone: "pending" as const };
  }

  if (status === "failed") {
    return { label: "실패", variant: "destructive" as const, rowTone: "failed" as const };
  }

  if (status === "canceled") {
    return { label: "취소", variant: "outline" as const, rowTone: "canceled" as const };
  }

  return { label: status, variant: "outline" as const, rowTone: "default" as const };
}

const FILTERS: Array<{ id: AdminProgramOrderFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "bank_pending", label: "무통장 대기" },
  { id: "bank_paid", label: "무통장 확인" },
  { id: "toss", label: "토스 결제" },
];

export function ProgramOrdersList({ orders, total, page, pageSize, totalPages, filter }: ProgramOrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<AdminProgramOrderRow | null>(null);
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const summaryText = useMemo(() => {
    if (total === 0) return "선택한 조건의 주문이 없습니다.";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [page, pageSize, total]);

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

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    const normalizedStart = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
  }, [page, totalPages]);

  const handleFilterChange = (nextFilter: AdminProgramOrderFilter) => {
    pushWithParams({ filter: nextFilter, page: "1" });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filterOption) => (
          <button
            key={filterOption.id}
            type="button"
            onClick={() => handleFilterChange(filterOption.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              filter === filterOption.id
                ? "border-ink bg-ink text-white"
                : "border-line bg-white text-ink-secondary hover:border-line-strong hover:text-ink"
            )}
          >
            <span>{filterOption.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-subtle">{summaryText}</p>
        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-27.5 self-end sm:self-auto">
            <SelectValue aria-label={String(pageSize)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개씩</SelectItem>
            <SelectItem value="20">20개씩</SelectItem>
            <SelectItem value="50">50개씩</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <Table>
          <TableHeader className="bg-surface-subtle text-ink-muted">
            <TableRow>
              <TableHead className="px-3">주문일</TableHead>
              <TableHead className="px-3">주문번호</TableHead>
              <TableHead className="px-3">회원</TableHead>
              <TableHead className="px-3">연락처</TableHead>
              <TableHead className="px-3">입금자명</TableHead>
              <TableHead className="px-3">프로그램</TableHead>
              <TableHead className="px-3">금액</TableHead>
              <TableHead className="px-3">결제수단</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">결제완료</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="px-3 py-8 text-center text-ink-subtle">
                  선택한 조건의 주문이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusMeta = getStatusMeta(order.status);

                return (
                  <TableRow key={order.id} tone={statusMeta.rowTone}>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(order.created_at)}</TableCell>
                    <TableCell className="px-3 font-mono text-xs text-ink-muted">{order.provider_order_id}</TableCell>
                    <TableCell className="px-3 text-ink">
                      <div className="space-y-0.5">
                        <p>{order.buyer_name}</p>
                        {order.buyer_email ? <p className="text-xs text-ink-subtle">{order.buyer_email}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{order.buyer_phone || "-"}</TableCell>
                    <TableCell className="px-3 text-ink-secondary">{order.depositor_name || "-"}</TableCell>
                    <TableCell className="max-w-60 px-3 text-ink-secondary">
                      <p className="whitespace-normal">{order.product_title}</p>
                    </TableCell>
                    <TableCell className="px-3 font-medium text-ink">{formatCurrency(order.amount_krw)}원</TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatPaymentMethod(order.payment_method)}</TableCell>
                    <TableCell className="px-3 text-ink-secondary">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(order.paid_at)}</TableCell>
                    <TableCell className="px-3 text-ink-secondary">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                          <Eye className="size-4" />
                          상세
                        </Button>
                        {order.payment_method === "bank_transfer" && order.status === "pending" ? (
                          <ApproveBankTransferOrderButton
                            orderId={order.id}
                            orderLabel={order.provider_order_id}
                            onApproved={() => router.refresh()}
                          />
                        ) : null}
                      </div>
                    </TableCell>
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
              disabled={page <= 1}
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
              disabled={page >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => (!open ? setSelectedOrder(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>주문 상세</DialogTitle>
            <DialogDescription>주문 정보와 입금 확인 상태를 확인합니다.</DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">주문번호</p>
                <p className="mt-1 font-mono text-sm text-ink">{selectedOrder.provider_order_id}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">주문 상태</p>
                <div className="mt-1">
                  <Badge variant={getStatusMeta(selectedOrder.status).variant}>{getStatusMeta(selectedOrder.status).label}</Badge>
                </div>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">구매자</p>
                <p className="mt-1 font-medium text-ink">{selectedOrder.buyer_name}</p>
                <p className="text-sm text-ink-muted">{selectedOrder.buyer_email || "-"}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">전화번호</p>
                <p className="mt-1 font-medium text-ink">{selectedOrder.buyer_phone || "-"}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">입금자명</p>
                <p className="mt-1 font-medium text-ink">{selectedOrder.depositor_name || "-"}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">결제수단</p>
                <p className="mt-1 font-medium text-ink">{formatPaymentMethod(selectedOrder.payment_method)}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">프로그램</p>
                <p className="mt-1 font-medium text-ink">{selectedOrder.product_title}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">결제금액</p>
                <p className="mt-1 font-medium text-ink">{formatCurrency(selectedOrder.amount_krw)}원</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">주문일</p>
                <p className="mt-1 font-medium text-ink">{formatAdminDateTime(selectedOrder.created_at)}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface-subtle p-4">
                <p className="text-xs text-ink-subtle">결제완료일</p>
                <p className="mt-1 font-medium text-ink">{formatAdminDateTime(selectedOrder.paid_at)}</p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedOrder(null)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
