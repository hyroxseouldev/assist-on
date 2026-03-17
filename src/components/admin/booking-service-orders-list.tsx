"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { updateBookingReservationStatusAction } from "@/lib/admin/actions";
import type { AdminBookingReservationRow, BookingReservationStatus } from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type BookingServiceOrdersListProps = {
  orders: AdminBookingReservationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusMeta(status: BookingReservationStatus) {
  if (status === "confirmed") return { label: "확정", variant: "default" as const };
  if (status === "requested") return { label: "요청", variant: "secondary" as const };
  if (status === "rejected") return { label: "거절", variant: "destructive" as const };
  if (status === "canceled") return { label: "취소", variant: "outline" as const };
  if (status === "completed") return { label: "이용완료", variant: "default" as const };
  if (status === "no_show") return { label: "노쇼", variant: "destructive" as const };
  return { label: "만료", variant: "outline" as const };
}

export function BookingServiceOrdersList({ orders, total, page, pageSize, totalPages }: BookingServiceOrdersListProps) {
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const summaryText = useMemo(() => {
    if (total === 0) return "예약 주문이 없습니다.";
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

  const createPageHref = (targetPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", nextPageSize);
    params.set("page", "1");
    const nextQuery = params.toString();
    push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const handleStatusChange = (reservationId: string, status: BookingReservationStatus) => {
    const formData = new FormData();
    formData.set("reservationId", reservationId);
    formData.set("status", status);

    startTransition(async () => {
      const result = await updateBookingReservationStatusAction(formData);
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
              <TableHead className="px-3">서비스</TableHead>
              <TableHead className="px-3">옵션</TableHead>
              <TableHead className="px-3">예약시간</TableHead>
              <TableHead className="px-3">예약자</TableHead>
              <TableHead className="px-3">연락처</TableHead>
              <TableHead className="px-3">금액</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-3 py-8 text-center text-zinc-500">
                  예약 주문이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => {
                const statusMeta = getStatusMeta(order.status);

                return (
                  <TableRow key={order.id}>
                    <TableCell className="px-3 text-zinc-700">{formatDateTime(order.created_at)}</TableCell>
                    <TableCell className="px-3 text-zinc-900">{order.service_name}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{order.option_name}</TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      {formatDateTime(order.slot_starts_at)} - {formatDateTime(order.slot_ends_at)}
                    </TableCell>
                    <TableCell className="px-3 text-zinc-900">{order.booker_name || "-"}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{order.booker_phone || "-"}</TableCell>
                    <TableCell className="px-3 font-medium text-zinc-900">{formatCurrency(order.price_krw)}</TableCell>
                    <TableCell className="px-3">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" disabled={isPending || order.status === "confirmed"} onClick={() => handleStatusChange(order.id, "confirmed")}>
                          확정
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={isPending || order.status === "rejected"} onClick={() => handleStatusChange(order.id, "rejected")}>
                          거절
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={isPending || order.status === "canceled"} onClick={() => handleStatusChange(order.id, "canceled")}>
                          취소
                        </Button>
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
    </div>
  );
}
