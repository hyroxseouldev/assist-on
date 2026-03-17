"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

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
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { formatAdminDate } from "@/lib/admin/format";
import type { AdminProgramListRow } from "@/lib/admin/types";

type ProgramsListProps = {
  programs: AdminProgramListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function formatDifficulty(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "초급";
  if (value === "advanced") return "고급";
  return "중급";
}

export function ProgramsList({ programs, total, page, pageSize, totalPages }: ProgramsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const programsPath = `${tenantBasePath}/admin/program`;

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 프로그램이 없습니다.";
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
          <Button onClick={() => push(`${programsPath}/new`)}>새 프로그램 등록</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">썸네일</TableHead>
              <TableHead className="px-3">프로그램명</TableHead>
              <TableHead className="px-3">난이도</TableHead>
              <TableHead className="px-3">하루 운동</TableHead>
              <TableHead className="px-3">주당 운동</TableHead>
              <TableHead className="px-3">기간</TableHead>
              <TableHead className="px-3">설명</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  등록된 프로그램이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program) => (
                <TableRow
                  key={program.id}
                  className="cursor-pointer"
                  onClick={() => push(`${programsPath}/${program.id}`)}
                >
                  <TableCell className="px-3">
                    <div className="relative size-12 overflow-hidden rounded-md border border-zinc-200 bg-white">
                      <Image
                        src={program.thumbnail_url || "/xon_logo.jpg"}
                        alt={`${program.title} 썸네일`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-medium text-zinc-900">{program.title}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDifficulty(program.difficulty)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{program.daily_workout_minutes}분</TableCell>
                  <TableCell className="px-3 text-zinc-700">주 {program.days_per_week}일</TableCell>
                  <TableCell className="px-3 text-zinc-700">
                    {formatAdminDate(program.start_date)} - {formatAdminDate(program.end_date)}
                  </TableCell>
                  <TableCell className="max-w-[280px] px-3 text-zinc-700">
                    <p className="line-clamp-2 whitespace-normal">{program.description || "-"}</p>
                  </TableCell>
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
