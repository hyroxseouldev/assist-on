"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

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
import type { NoticeRow } from "@/lib/admin/types";

type NoticesListProps = {
  notices: NoticeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NoticesList({ notices, total, page, pageSize, totalPages }: NoticesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const noticesPath = `${tenantBasePath}/admin/notices`;
  const noticeCreatePath = `${noticesPath}/new`;

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 공지가 없습니다.";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [page, pageSize, total]);

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

  const handlePageSizeChange = (nextPageSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", nextPageSize);
    params.set("page", "1");
    const nextQuery = params.toString();
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
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
          <Button onClick={() => router.push(noticeCreatePath)}>새 공지 등록</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">대표 이미지</TableHead>
              <TableHead className="px-3">제목</TableHead>
              <TableHead className="px-3">공개</TableHead>
              <TableHead className="px-3">생성일</TableHead>
              <TableHead className="px-3">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                  등록된 공지가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              notices.map((notice) => (
                <TableRow
                  key={notice.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`${noticesPath}/${notice.id}`)}
                >
                  <TableCell className="px-3">
                    <div className="relative size-12 overflow-hidden rounded-md border border-zinc-200 bg-white">
                      <Image
                        src={notice.thumbnail_url || "/xon_logo.jpg"}
                        alt={`${notice.title} 대표 이미지`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-medium text-zinc-900">{notice.title}</TableCell>
                  <TableCell className="px-3">
                    <Badge variant={notice.is_published ? "default" : "secondary"}>
                      {notice.is_published ? "공개" : "비공개"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDateTime(notice.created_at)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDateTime(notice.updated_at)}</TableCell>
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
