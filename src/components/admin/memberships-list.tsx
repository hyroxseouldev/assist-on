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
import type { AdminMembershipRow, AdminMembershipStatus, AdminMembershipStatusFilter } from "@/lib/admin/types";

type MembershipProgramOption = {
  id: string;
  label: string;
  thumbnailUrl: string | null;
};

type MembershipsListProps = {
  memberships: AdminMembershipRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  selectedProgramId: string;
  status: AdminMembershipStatusFilter;
  programs: MembershipProgramOption[];
};

const statusOptions: Array<{ value: AdminMembershipStatusFilter; label: string }> = [
  { value: "all", label: "전체 상태" },
  { value: "active", label: "활성" },
  { value: "pending", label: "대기" },
  { value: "expired", label: "만료" },
  { value: "inactive", label: "비활성" },
];

function getStatusMeta(status: AdminMembershipStatus) {
  if (status === "active") {
    return { label: "활성", variant: "default" as const, appearance: "success" as const };
  }

  if (status === "pending") {
    return { label: "대기", variant: "secondary" as const, appearance: "info" as const };
  }

  if (status === "expired") {
    return { label: "만료", variant: "outline" as const, appearance: "warning" as const };
  }

  return { label: "비활성", variant: "outline" as const, appearance: "inactive" as const };
}

export function MembershipsList({
  memberships,
  total,
  page,
  pageSize,
  totalPages,
  query,
  selectedProgramId,
  status,
  programs,
}: MembershipsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(query);

  const summaryText = useMemo(() => {
    if (total === 0) return "선택한 조건의 멤버쉽 이력이 없습니다.";

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
            placeholder="회원명, 이메일 또는 휴대폰 번호 검색"
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

      <div className="overflow-hidden rounded-lg border border-line">
        <Table>
          <TableHeader className="bg-surface-subtle text-ink-muted">
            <TableRow>
              <TableHead className="px-3">회원</TableHead>
              <TableHead className="px-3">휴대폰</TableHead>
              <TableHead className="px-3">프로그램</TableHead>
              <TableHead className="px-3">기수</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">시작일</TableHead>
              <TableHead className="px-3">종료일</TableHead>
              <TableHead className="px-3">현재 선택 프로그램</TableHead>
              <TableHead className="px-3">생성일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="px-3 py-8 text-center text-ink-subtle">
                  선택한 조건의 멤버쉽 이력이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              memberships.map((membership) => {
                const statusMeta = getStatusMeta(membership.status);

                return (
                  <TableRow key={membership.id}>
                    <TableCell className="px-3 text-ink">
                      <div className="space-y-0.5">
                        <p className="font-medium">{membership.user_name}</p>
                        <p className="text-xs text-ink-subtle">{membership.user_email || membership.user_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{membership.user_phone_number || "-"}</TableCell>
                    <TableCell className="max-w-60 px-3 font-medium text-ink">
                      <p className="whitespace-normal">{membership.program_title}</p>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">
                      {membership.cohort_name ? (
                        <div className="space-y-0.5">
                          <p>{membership.cohort_name}</p>
                          {membership.cohort_starts_on ? <p className="text-xs text-ink-subtle">{membership.cohort_starts_on}</p> : null}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={statusMeta.variant} appearance={statusMeta.appearance}>
                        {statusMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(membership.starts_at)}</TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(membership.ends_at)}</TableCell>
                    <TableCell className="px-3">
                      {membership.is_current_program ? <Badge variant="secondary">현재 선택</Badge> : <span className="text-ink-faint">-</span>}
                    </TableCell>
                    <TableCell className="px-3 text-ink-secondary">{formatAdminDateTime(membership.created_at)}</TableCell>
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
