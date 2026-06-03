"use client";

import { Eye, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
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
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { updateGuestOrderStatusAction } from "@/lib/admin/actions";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminGuestOrderFilter, AdminGuestOrderRow, GuestOrderStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type GuestOrdersListProps = {
  orders: AdminGuestOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminGuestOrderFilter;
};

const FILTERS: Array<{ id: AdminGuestOrderFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "pending", label: "대기" },
  { id: "confirmed", label: "확정" },
  { id: "canceled", label: "취소" },
];

const STATUS_OPTIONS: Array<{ id: GuestOrderStatus; label: string }> = [
  { id: "pending", label: "대기" },
  { id: "confirmed", label: "확정" },
  { id: "canceled", label: "취소" },
];

function getStatusMeta(status: GuestOrderStatus) {
  if (status === "confirmed") {
    return { label: "확정", variant: "default" as const, rowClassName: "bg-emerald-50/60" };
  }

  if (status === "canceled") {
    return { label: "취소", variant: "outline" as const, rowClassName: "bg-zinc-50" };
  }

  return { label: "대기", variant: "secondary" as const, rowClassName: "bg-amber-50/50" };
}

function formatCurrency(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "-";
  }

  return `${new Intl.NumberFormat("ko-KR").format(Math.floor(amount))}원`;
}

function formatText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "-";
}

function formatDuration(value: unknown) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) {
    return "-";
  }

  return `${Math.floor(duration)}개월`;
}

function getPayloadLabel(payload: Record<string, unknown>) {
  const programName = formatText(payload.programName);
  if (programName !== "-") return programName;

  const storeName = formatText(payload.storeName);
  if (storeName !== "-") return storeName;

  return "-";
}

function getBuyerGoal(payload: Record<string, unknown>) {
  return formatText(payload.buyerGoal);
}

function getTotalAmount(payload: Record<string, unknown>) {
  if (typeof payload.totalAmountKrw !== "undefined") {
    return payload.totalAmountKrw;
  }

  const monthlyPrice = Number(payload.monthlyPriceKrw);
  const durationMonths = Number(payload.durationMonths);
  if (Number.isFinite(monthlyPrice) && Number.isFinite(durationMonths)) {
    return monthlyPrice * durationMonths;
  }

  return undefined;
}

export function GuestOrdersList({ orders, total, page, pageSize, totalPages, filter }: GuestOrdersListProps) {
  const [selectedOrder, setSelectedOrder] = useState<AdminGuestOrderRow | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();

  const summaryText = useMemo(() => {
    if (total === 0) return "선택한 조건의 게스트 주문이 없습니다.";
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

  const handleFilterChange = (nextFilter: AdminGuestOrderFilter) => {
    pushWithParams({ filter: nextFilter, page: "1" });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  const handleStatusChange = (order: AdminGuestOrderRow, status: GuestOrderStatus) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("orderId", order.id);
    formData.set("status", status);
    setUpdatingOrderId(order.id);

    startTransition(async () => {
      const result = await updateGuestOrderStatusAction(formData);
      setUpdatingOrderId(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
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
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
            )}
          >
            <span>{filterOption.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">{summaryText}</p>
        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
          <SelectTrigger className="w-[110px] self-end sm:self-auto">
            <SelectValue aria-label={String(pageSize)} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10개씩</SelectItem>
            <SelectItem value="20">20개씩</SelectItem>
            <SelectItem value="50">50개씩</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">접수일</TableHead>
              <TableHead className="px-3">주문자</TableHead>
              <TableHead className="px-3">핸드폰</TableHead>
              <TableHead className="px-3">프로그램/스토어</TableHead>
              <TableHead className="px-3">목표 및 참고 사항</TableHead>
              <TableHead className="px-3">월 가격</TableHead>
              <TableHead className="px-3">개월수</TableHead>
              <TableHead className="px-3">총액</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                  선택한 조건의 게스트 주문이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusMeta = getStatusMeta(order.status);
                const payload = order.order_payload;
                const isUpdating = isPending && updatingOrderId === order.id;

                return (
                  <TableRow key={order.id} className={statusMeta.rowClassName}>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(order.created_at)}</TableCell>
                    <TableCell className="px-3 font-medium text-zinc-900">{order.buyer_name}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{order.buyer_phone}</TableCell>
                    <TableCell className="max-w-[220px] px-3 text-zinc-700">
                      <p className="whitespace-normal">{getPayloadLabel(payload)}</p>
                    </TableCell>
                    <TableCell className="max-w-[260px] px-3 text-zinc-700">
                      <p className="line-clamp-2 whitespace-pre-line text-sm leading-5">{getBuyerGoal(payload)}</p>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatCurrency(payload.monthlyPriceKrw)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatDuration(payload.durationMonths)}</TableCell>
                    <TableCell className="px-3 font-medium text-zinc-900">{formatCurrency(getTotalAmount(payload))}</TableCell>
                    <TableCell className="px-3">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedOrder(order)}>
                          <Eye className="size-4" />
                          상세
                        </Button>
                        <Select
                          value={order.status}
                          disabled={isPending}
                          onValueChange={(value) => handleStatusChange(order, value as GuestOrderStatus)}
                        >
                          <SelectTrigger className="h-9 w-[112px] bg-white">
                            {isUpdating ? <Loader2 className="size-4 animate-spin" /> : null}
                            <SelectValue aria-label={statusMeta.label} />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                if (page <= 1) event.preventDefault();
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
                if (page >= totalPages) event.preventDefault();
              }}
              className={page >= totalPages ? "pointer-events-none opacity-50" : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => (!open ? setSelectedOrder(null) : undefined)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>게스트 주문 상세</DialogTitle>
            <DialogDescription>랜딩 페이지에서 접수된 주문 원본 정보를 확인합니다.</DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">주문자</p>
                  <p className="mt-1 font-medium text-zinc-900">{selectedOrder.buyer_name}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">핸드폰</p>
                  <p className="mt-1 font-medium text-zinc-900">{selectedOrder.buyer_phone}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">상태</p>
                  <div className="mt-1">
                    <Badge variant={getStatusMeta(selectedOrder.status).variant}>{getStatusMeta(selectedOrder.status).label}</Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">접수일</p>
                  <p className="mt-1 font-medium text-zinc-900">{formatAdminDateTime(selectedOrder.created_at)}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">프로그램/스토어</p>
                  <p className="mt-1 font-medium text-zinc-900">{getPayloadLabel(selectedOrder.order_payload)}</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs text-zinc-500">금액</p>
                  <p className="mt-1 font-medium text-zinc-900">
                    {formatCurrency(selectedOrder.order_payload.monthlyPriceKrw)} · {formatDuration(selectedOrder.order_payload.durationMonths)}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">목표 및 참고 사항</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-900">{getBuyerGoal(selectedOrder.order_payload)}</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-950 p-4">
                <p className="text-xs text-zinc-400">원본 주문 데이터</p>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-zinc-100">
                  {JSON.stringify(selectedOrder.order_payload, null, 2)}
                </pre>
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
