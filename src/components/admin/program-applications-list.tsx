"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { updateProgramApplicationStatusAction } from "@/lib/admin/actions";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
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
import { formatAdminDateTime } from "@/lib/admin/format";
import type { AdminProgramApplicationFilter, AdminProgramApplicationRow, ProgramApplicationStatus } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type ProgramApplicationsListProps = {
  applications: AdminProgramApplicationRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filter: AdminProgramApplicationFilter;
};

const FILTERS: Array<{ id: AdminProgramApplicationFilter; label: string }> = [
  { id: "pending", label: "대기" },
  { id: "approved", label: "승인" },
  { id: "rejected", label: "거절" },
  { id: "canceled", label: "취소" },
  { id: "all", label: "전체" },
];

function getStatusMeta(status: ProgramApplicationStatus) {
  if (status === "approved") return { label: "승인", variant: "default" as const, rowClassName: "bg-emerald-50/60" };
  if (status === "rejected") return { label: "거절", variant: "destructive" as const, rowClassName: "bg-rose-50/50" };
  if (status === "canceled") return { label: "취소", variant: "outline" as const, rowClassName: "bg-zinc-50" };
  return { label: "대기", variant: "secondary" as const, rowClassName: "bg-amber-50/50" };
}

export function ProgramApplicationsList({ applications, total, page, pageSize, totalPages, filter }: ProgramApplicationsListProps) {
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();
  const [isPending, startTransition] = useTransition();

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

  const handleStatusChange = (applicationId: string, nextStatus: ProgramApplicationStatus) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("applicationId", applicationId);
    formData.set("status", nextStatus);

    startTransition(async () => {
      const result = await updateProgramApplicationStatusAction(formData);
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
            onClick={() => pushWithParams({ filter: filterOption.id, page: "1" })}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              filter === filterOption.id
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:text-zinc-900"
            )}
          >
            {filterOption.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500">{summaryText}</p>
        <Select value={String(pageSize)} onValueChange={(nextPageSize) => pushWithParams({ pageSize: nextPageSize, page: "1" })}>
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
              <TableHead className="px-3">신청일</TableHead>
              <TableHead className="px-3">프로그램</TableHead>
              <TableHead className="px-3">신청자</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">수정일</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  선택한 조건의 프로그램 신청이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              applications.map((application) => {
                const statusMeta = getStatusMeta(application.status);

                return (
                  <TableRow key={application.id} className={statusMeta.rowClassName}>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(application.created_at)}</TableCell>
                    <TableCell className="max-w-[260px] px-3 font-medium text-zinc-900">
                      <p className="whitespace-normal">{application.program_title}</p>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-900">
                      <div className="space-y-0.5">
                        <p>{application.user_name}</p>
                        <p className="text-xs text-zinc-500">{application.user_email || application.user_id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(application.updated_at)}</TableCell>
                    <TableCell className="px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isPending || application.status === "approved"}
                          onClick={() => handleStatusChange(application.id, "approved")}
                        >
                          승인
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending || application.status === "rejected"}
                          onClick={() => handleStatusChange(application.id, "rejected")}
                        >
                          거절
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isPending || application.status === "canceled"}
                          onClick={() => handleStatusChange(application.id, "canceled")}
                        >
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
