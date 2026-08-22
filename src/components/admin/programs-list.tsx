"use client";

import { X } from "lucide-react";
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
import type {
  AdminProgramDeliveryModeFilter,
  AdminProgramDifficultyFilter,
  AdminProgramListRow,
  AdminProgramMobileVisibilityFilter,
} from "@/lib/admin/types";

type ProgramsListProps = {
  programs: AdminProgramListRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  difficulty: AdminProgramDifficultyFilter;
  mobileVisibility: AdminProgramMobileVisibilityFilter;
  deliveryMode: AdminProgramDeliveryModeFilter;
};

const DIFFICULTY_FILTER_OPTIONS: Array<{ value: AdminProgramDifficultyFilter; label: string }> = [
  { value: "all", label: "전체 난이도" },
  { value: "beginner", label: "초급" },
  { value: "intermediate", label: "중급" },
  { value: "advanced", label: "고급" },
];

const MOBILE_VISIBILITY_FILTER_OPTIONS: Array<{ value: AdminProgramMobileVisibilityFilter; label: string }> = [
  { value: "all", label: "전체 공개 상태" },
  { value: "public", label: "공개" },
  { value: "members_only", label: "구매 멤버" },
  { value: "private", label: "비공개" },
];

const DELIVERY_MODE_FILTER_OPTIONS: Array<{ value: AdminProgramDeliveryModeFilter; label: string }> = [
  { value: "all", label: "전체 운영 방식" },
  { value: "fixed_date", label: "고정 기간" },
  { value: "cohort_based", label: "기수제" },
];

function formatDifficulty(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "초급";
  if (value === "advanced") return "고급";
  return "중급";
}

function formatMobileVisibility(value: AdminProgramListRow["mobile_visibility"]) {
  if (value === "members_only") return "구매 멤버";
  if (value === "private") return "비공개";
  return "공개";
}

function formatDeliveryMode(value: AdminProgramListRow["delivery_mode"]) {
  if (value === "cohort_based") return "기수제";
  return "고정 기간";
}

export function ProgramsList({
  programs,
  total,
  page,
  pageSize,
  totalPages,
  difficulty,
  mobileVisibility,
  deliveryMode,
}: ProgramsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const programsPath = `${tenantBasePath}/admin/program`;
  const hasActiveFilters = difficulty !== "all" || mobileVisibility !== "all" || deliveryMode !== "all";

  const summaryText = useMemo(() => {
    if (total === 0) return hasActiveFilters ? "선택한 조건의 프로그램이 없습니다." : "등록된 프로그램이 없습니다.";
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [hasActiveFilters, page, pageSize, total]);

  const pushWithParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all") {
        params.delete(key);
        return;
      }

      params.set(key, value);
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

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  const handleFilterChange = (
    key: "difficulty" | "mobileVisibility" | "deliveryMode",
    value: AdminProgramDifficultyFilter | AdminProgramMobileVisibilityFilter | AdminProgramDeliveryModeFilter
  ) => {
    pushWithParams({ [key]: value, page: "1" });
  };

  const handleResetFilters = () => {
    pushWithParams({ difficulty: null, mobileVisibility: null, deliveryMode: null, page: "1" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Select value={difficulty} onValueChange={(value) => handleFilterChange("difficulty", value as AdminProgramDifficultyFilter)}>
          <SelectTrigger className="w-full bg-white sm:w-[150px]">
            <SelectValue aria-label={DIFFICULTY_FILTER_OPTIONS.find((option) => option.value === difficulty)?.label} />
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTY_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={mobileVisibility}
          onValueChange={(value) => handleFilterChange("mobileVisibility", value as AdminProgramMobileVisibilityFilter)}
        >
          <SelectTrigger className="w-full bg-white sm:w-[170px]">
            <SelectValue aria-label={MOBILE_VISIBILITY_FILTER_OPTIONS.find((option) => option.value === mobileVisibility)?.label} />
          </SelectTrigger>
          <SelectContent>
            {MOBILE_VISIBILITY_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={deliveryMode} onValueChange={(value) => handleFilterChange("deliveryMode", value as AdminProgramDeliveryModeFilter)}>
          <SelectTrigger className="w-full bg-white sm:w-[160px]">
            <SelectValue aria-label={DELIVERY_MODE_FILTER_OPTIONS.find((option) => option.value === deliveryMode)?.label} />
          </SelectTrigger>
          <SelectContent>
            {DELIVERY_MODE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={handleResetFilters} className="self-start sm:ml-auto sm:self-auto">
            <X className="size-4" />
            필터 초기화
          </Button>
        ) : null}
      </div>

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
              <TableHead className="px-3">우선순위</TableHead>
              <TableHead className="px-3">썸네일</TableHead>
              <TableHead className="px-3">프로그램명</TableHead>
              <TableHead className="px-3">모바일 공개</TableHead>
              <TableHead className="px-3">난이도</TableHead>
              <TableHead className="px-3">운영 방식</TableHead>
              <TableHead className="px-3">하루 운동</TableHead>
              <TableHead className="px-3">주당 운동</TableHead>
              <TableHead className="px-3">기간</TableHead>
              <TableHead className="px-3">설명</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                  {hasActiveFilters ? "선택한 조건의 프로그램이 없습니다." : "등록된 프로그램이 없습니다."}
                </TableCell>
              </TableRow>
            ) : (
              programs.map((program) => (
                <TableRow
                  key={program.id}
                  className="cursor-pointer"
                  onClick={() => push(`${programsPath}/${program.id}`)}
                >
                  <TableCell className="px-3 text-zinc-700">{program.display_order}</TableCell>
                  <TableCell className="px-3">
                    <div className="relative size-12 overflow-hidden rounded-md border border-zinc-200 bg-white">
                      <Image
                        src={program.thumbnail_url || "/logo.png"}
                        alt={`${program.title} 썸네일`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3 font-medium text-zinc-900">{program.title}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatMobileVisibility(program.mobile_visibility)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDifficulty(program.difficulty)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDeliveryMode(program.delivery_mode)}</TableCell>
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
