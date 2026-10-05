"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { AdminProgramApplicationFilter, AdminProgramApplicationRow, ProgramApplicationStatus } from "@/lib/admin/types";

type ProgramApplicationProgramOption = {
  id: string;
  label: string;
  thumbnailUrl: string | null;
};

type ProgramApplicationsListProps = {
  applications: AdminProgramApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  selectedProgramId: string;
  status: AdminProgramApplicationFilter;
  programs: ProgramApplicationProgramOption[];
};

const statusOptions: Array<{ value: AdminProgramApplicationFilter; label: string }> = [
  { value: "all", label: "전체 상태" },
  { value: "pending", label: "대기" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "거절" },
  { value: "canceled", label: "취소" },
];

function getStatusMeta(status: ProgramApplicationStatus) {
  if (status === "approved") {
    return { label: "승인", variant: "default" as const, appearance: "success" as const };
  }

  if (status === "rejected") {
    return { label: "거절", variant: "destructive" as const, appearance: "critical" as const };
  }

  if (status === "canceled") {
    return { label: "취소", variant: "outline" as const, appearance: "inactive" as const };
  }

  return { label: "대기", variant: "secondary" as const, appearance: "warning" as const };
}

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "U";
}

export function ProgramApplicationsList({
  applications,
  total,
  page,
  pageSize,
  totalPages,
  query,
  selectedProgramId,
  status,
  programs,
}: ProgramApplicationsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(query);

  const summaryText = useMemo(() => {
    if (total === 0) return "선택한 조건의 프로그램 신청이 없습니다.";

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

  return (
    <div className="space-y-4">
      <div className="grid gap-2 lg:grid-cols-[1fr_240px_170px_130px]">
        <div className="flex gap-2">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="회원명, 이메일, 휴대폰 또는 프로그램 검색"
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

        <Select
          value={selectedProgramId || "all"}
          onValueChange={(nextProgramId) => pushWithParams({ programId: nextProgramId === "all" ? null : nextProgramId, page: "1" })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="전체 프로그램" />
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

        <Select value={status} onValueChange={(nextStatus) => pushWithParams({ status: nextStatus === "all" ? null : nextStatus, page: "1" })}>
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

      <p className="text-sm text-ink-subtle">{summaryText}</p>

      <div className="overflow-x-auto rounded-lg border border-line">
        <Table className="min-w-245">
          <TableHeader className="bg-surface-subtle text-ink-muted">
            <TableRow>
              <TableHead className="w-16 px-3">프로필</TableHead>
              <TableHead className="min-w-52.5 px-3">이름</TableHead>
              <TableHead className="min-w-35 px-3">휴대폰</TableHead>
              <TableHead className="min-w-70 px-3">프로그램</TableHead>
              <TableHead className="min-w-25 px-3">상태</TableHead>
              <TableHead className="min-w-37.5 px-3">신청일</TableHead>
              <TableHead className="min-w-37.5 px-3">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-8 text-center text-ink-subtle">
                  선택한 조건의 프로그램 신청이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((application) => {
                const statusMeta = getStatusMeta(application.status);

                return (
                  <TableRow key={application.id}>
                    <TableCell className="px-3">
                      <Avatar className="size-8">
                        <AvatarImage src={application.user_avatar_url ?? undefined} alt={`${application.user_name} 프로필`} />
                        <AvatarFallback>{getInitial(application.user_name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="px-3 text-ink">
                      <div className="space-y-0.5">
                        <p className="font-medium">{application.user_name}</p>
                        <p className="text-xs text-ink-subtle">{application.user_email || application.user_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{application.user_phone_number || "-"}</TableCell>
                    <TableCell className="px-3 font-medium text-ink">
                      <p className="whitespace-normal">{application.program_title}</p>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={statusMeta.variant} appearance={statusMeta.appearance}>
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(application.created_at)}</TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(application.updated_at)}</TableCell>
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
    </div>
  );
}
