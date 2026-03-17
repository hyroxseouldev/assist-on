"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

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
import type { AdminProgramProductRow } from "@/lib/admin/types";

type ProgramProductsManagerProps = {
  products: AdminProgramProductRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDurationSummary(product: AdminProgramProductRow) {
  if (product.sale_type === "subscription") {
    return "월 구독";
  }

  const enabledDurations = product.duration_options.filter((option) => option.is_enabled).map((option) => `${option.duration_months}개월`);
  return enabledDurations.length > 0 ? enabledDurations.join(", ") : "기간권 미설정";
}

function formatSaleStatus(value: "active" | "preparing" | "private") {
  if (value === "active") return "판매중";
  if (value === "preparing") return "준비중";
  return "비공개";
}

export function ProgramProductsManager({ products, total, page, pageSize, totalPages }: ProgramProductsManagerProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const tenantSlug = tenantBasePath.split("/")[2] ?? "";
  const productsPath = `${tenantBasePath}/admin/store/products`;

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 판매 상품이 없습니다. 프로그램을 먼저 생성해 주세요.";
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

  const handleCopyLink = async (productId: string) => {
    if (!tenantSlug) {
      toast.error("테넌트 정보를 찾지 못했습니다.");
      return;
    }

    await navigator.clipboard.writeText(`${window.location.origin}/store/${tenantSlug}/${productId}`);
    toast.success("상품 링크가 복사되었습니다.");
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
              <TableHead className="px-3">썸네일</TableHead>
              <TableHead className="px-3">프로그램</TableHead>
              <TableHead className="px-3">가격</TableHead>
              <TableHead className="px-3">유형</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">링크</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  등록된 판매 상품이 없습니다. 프로그램을 먼저 생성해 주세요.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => push(`${productsPath}/${product.id}`)}
                >
                  <TableCell className="px-3">
                    <div className="relative size-14 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                      <Image
                        src={product.thumbnail_urls[0] || "/xon_logo.jpg"}
                        alt={`${product.program_title} 썸네일`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="px-3">
                    <p className="font-medium text-zinc-900">{product.program_title}</p>
                    <p className="text-xs text-zinc-500">상품 ID: {product.id}</p>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">
                    {formatCurrency(product.price_krw)}원{product.sale_type === "one_time" ? "부터" : ""}
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatDurationSummary(product)}</TableCell>
                  <TableCell className="px-3 text-zinc-700">{formatSaleStatus(product.sale_status)}</TableCell>
                  <TableCell className="px-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleCopyLink(product.id);
                      }}
                    >
                      링크복사
                    </Button>
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
