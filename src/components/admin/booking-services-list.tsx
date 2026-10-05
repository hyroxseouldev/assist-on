"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
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
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminBookingServiceListRow } from "@/lib/admin/types";

type BookingServicesListProps = {
  services: AdminBookingServiceListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function BookingServicesList({ services, total, page, pageSize, totalPages }: BookingServicesListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const createPath = `${tenantBasePath}/admin/booking-services/new`;
  const detailPath = `${tenantBasePath}/admin/booking-services`;

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 예약 서비스가 없습니다.";
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-subtle">{summaryText}</p>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-27.5">
              <SelectValue aria-label={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10개씩</SelectItem>
              <SelectItem value="20">20개씩</SelectItem>
              <SelectItem value="50">50개씩</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => push(createPath)}>새 예약 서비스</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-line">
        <Table>
          <TableHeader className="bg-surface-subtle text-ink-muted">
            <TableRow>
              <TableHead className="px-3">서비스명</TableHead>
              <TableHead className="px-3">옵션</TableHead>
              <TableHead className="px-3">활성 슬롯</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-3 py-8 text-center text-ink-subtle">
                  등록된 예약 서비스가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              services.map((service) => (
                <TableRow key={service.id} className="cursor-pointer" onClick={() => push(`${detailPath}/${service.id}`)}>
                  <TableCell className="px-3">
                    <div className="space-y-1">
                      <p className="font-medium text-ink">{service.name}</p>
                      <p className="line-clamp-1 text-xs text-ink-subtle">{service.description || "설명 없음"}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-ink-secondary">{service.option_count}개</TableCell>
                  <TableCell className="px-3 text-ink-secondary">{service.active_slot_count}개</TableCell>
                  <TableCell className="px-3">
                    <Badge variant={service.is_active ? "default" : "secondary"}>{service.is_active ? "활성" : "비활성"}</Badge>
                  </TableCell>
                  <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(service.updated_at)}</TableCell>
                </TableRow>
              ))
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
                if (page >= totalPages) event.preventDefault();
              }}
              disabled={page >= totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
