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
import type { AdminLocationListRow } from "@/lib/admin/types";

type LocationsListProps = {
  locations: AdminLocationListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function LocationsList({ locations, total, page, pageSize, totalPages }: LocationsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const locationsPath = `${tenantBasePath}/admin/locations`;

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 지점이 없습니다.";
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
        <p className="text-sm text-zinc-500">{summaryText}</p>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-[110px]">
              <SelectValue aria-label={String(pageSize)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10개씩</SelectItem>
              <SelectItem value="20">20개씩</SelectItem>
              <SelectItem value="50">50개씩</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => push(`${locationsPath}/new`)}>새 지점</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">지점명</TableHead>
              <TableHead className="px-3">주소</TableHead>
              <TableHead className="px-3">이미지</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                  등록된 지점이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              locations.map((location) => (
                <TableRow key={location.id} className="cursor-pointer" onClick={() => push(`${locationsPath}/${location.id}`)}>
                  <TableCell className="px-3">
                    <div className="space-y-1">
                      <p className="font-medium text-zinc-900">{location.name}</p>
                      <p className="text-xs text-zinc-500">정렬 {location.sort_order}</p>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">{location.address}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{location.image_count}장</TableCell>
                  <TableCell className="px-3">
                    <Badge variant={location.is_published ? "default" : "secondary"}>{location.is_published ? "공개" : "비공개"}</Badge>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(location.updated_at)}</TableCell>
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
