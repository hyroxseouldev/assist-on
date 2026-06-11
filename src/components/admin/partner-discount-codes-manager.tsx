"use client";

import Image from "next/image";
import { Loader2, Pencil, Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

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
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import {
  togglePartnerDiscountCodeActiveAction,
  togglePartnerDiscountCodeMobileVisibilityAction,
} from "@/lib/admin/actions";
import { formatAdminDateTime } from "@/lib/admin/format";
import type {
  AdminPartnerDiscountCodeRow,
  PartnerDiscountMobileVisibility,
  PartnerDiscountVisibilityScope,
} from "@/lib/admin/types";

type PartnerDiscountCodesManagerProps = {
  codes: AdminPartnerDiscountCodeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const visibilityScopeLabels: Record<PartnerDiscountVisibilityScope, string> = {
  all_members: "전체 회원",
  program_members: "프로그램 회원",
};

const mobileVisibilityLabels: Record<PartnerDiscountMobileVisibility, string> = {
  public: "모바일 공개",
  private: "비공개",
};

function getCodeStatus(code: AdminPartnerDiscountCodeRow) {
  const now = Date.now();
  const startsAt = code.starts_at ? Date.parse(code.starts_at) : null;
  const endsAt = code.ends_at ? Date.parse(code.ends_at) : null;

  if (!code.is_active) {
    return { label: "비활성", variant: "outline" as const };
  }

  if (startsAt !== null && startsAt > now) {
    return { label: "대기", variant: "secondary" as const };
  }

  if (endsAt !== null && endsAt <= now) {
    return { label: "만료", variant: "outline" as const };
  }

  return { label: "활성", variant: "default" as const };
}

export function PartnerDiscountCodesManager({
  codes,
  total,
  page,
  pageSize,
  totalPages,
}: PartnerDiscountCodesManagerProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();
  const [isTogglePending, startToggleTransition] = useTransition();
  const [updatingCodeId, setUpdatingCodeId] = useState<string | null>(null);

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 제휴 할인 코드가 없습니다.";
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

  const handleToggleActive = (code: AdminPartnerDiscountCodeRow) => {
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("codeId", code.id);
    formData.set("isActive", String(!code.is_active));
    setUpdatingCodeId(code.id);

    startToggleTransition(async () => {
      const result = await togglePartnerDiscountCodeActiveAction(formData);
      setUpdatingCodeId(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  const handleToggleMobileVisibility = (code: AdminPartnerDiscountCodeRow) => {
    const nextVisibility: PartnerDiscountMobileVisibility = code.mobile_visibility === "public" ? "private" : "public";
    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("codeId", code.id);
    formData.set("mobileVisibility", nextVisibility);
    setUpdatingCodeId(code.id);

    startToggleTransition(async () => {
      const result = await togglePartnerDiscountCodeMobileVisibilityAction(formData);
      setUpdatingCodeId(null);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
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
          <Button type="button" onClick={() => push(`${pathname}/new`)}>
            <Plus className="size-4" />
            새 제휴 코드
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">브랜드</TableHead>
              <TableHead className="px-3">혜택</TableHead>
              <TableHead className="px-3">코드</TableHead>
              <TableHead className="px-3">노출</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">기간</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {codes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  등록된 제휴 할인 코드가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              codes.map((code) => {
                const status = getCodeStatus(code);
                const isUpdating = isTogglePending && updatingCodeId === code.id;

                return (
                  <TableRow key={code.id}>
                    <TableCell className="px-3">
                      <div className="flex items-center gap-3">
                        <div className="relative size-9 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                          {code.brand_logo_url ? <Image src={code.brand_logo_url} alt={`${code.brand_name} 로고`} fill className="object-cover" /> : null}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{code.brand_name}</p>
                          <p className="text-xs text-zinc-500">정렬 {code.display_order}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[260px] px-3">
                      <p className="font-medium text-zinc-900">{code.title}</p>
                      <p className="line-clamp-1 text-xs text-zinc-500">{code.description || code.use_url}</p>
                    </TableCell>
                    <TableCell className="px-3 font-mono font-semibold text-zinc-950">{code.code_text}</TableCell>
                    <TableCell className="px-3">
                      <div className="space-y-1">
                        <Badge variant={code.mobile_visibility === "public" ? "default" : "outline"}>
                          {mobileVisibilityLabels[code.mobile_visibility]}
                        </Badge>
                        <p className="text-xs text-zinc-500">
                          {visibilityScopeLabels[code.visibility_scope]}
                          {code.program_title ? ` · ${code.program_title}` : ""}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">
                      {code.starts_at || code.ends_at ? (
                        <span>
                          {formatAdminDateTime(code.starts_at)} ~ {formatAdminDateTime(code.ends_at)}
                        </span>
                      ) : (
                        "상시"
                      )}
                    </TableCell>
                    <TableCell className="px-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => push(`${pathname}/${code.id}`)}>
                          <Pencil className="size-4" />
                          수정
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={isTogglePending} onClick={() => handleToggleActive(code)}>
                          {isUpdating ? <Loader2 className="size-4 animate-spin" /> : null}
                          {code.is_active ? "비활성화" : "활성화"}
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={isTogglePending} onClick={() => handleToggleMobileVisibility(code)}>
                          {code.mobile_visibility === "public" ? "비공개" : "공개"}
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
