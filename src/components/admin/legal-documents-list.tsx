"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
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
import type { AdminLegalDocumentRow } from "@/lib/admin/types";

type LegalDocumentsListProps = {
  tenantSlug: string;
  documents: AdminLegalDocumentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const typeLabel: Record<AdminLegalDocumentRow["type"], string> = {
  electronic_commerce_terms: "전자상거래 이용약관",
  terms_of_service: "이용약관",
  privacy_policy: "개인정보처리방침",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getPublicPath(tenantSlug: string, type: AdminLegalDocumentRow["type"]) {
  if (type === "electronic_commerce_terms") {
    return null;
  }

  if (type === "privacy_policy") {
    return `/t/${tenantSlug}/legal/privacy`;
  }

  return `/t/${tenantSlug}/legal/terms`;
}

export function LegalDocumentsList({ tenantSlug, documents, total, page, pageSize, totalPages }: LegalDocumentsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 약관이 없습니다.";
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
              <TableHead className="px-3">문서 종류</TableHead>
              <TableHead className="px-3">언어</TableHead>
              <TableHead className="px-3">제목</TableHead>
              <TableHead className="px-3">버전</TableHead>
              <TableHead className="px-3">게시 상태</TableHead>
              <TableHead className="px-3">게시일</TableHead>
              <TableHead className="px-3">수정일</TableHead>
              <TableHead className="px-3">공개 링크</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                  등록된 약관이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((document) => {
                const publicPath = getPublicPath(tenantSlug, document.type);

                return (
                  <TableRow key={document.id}>
                    <TableCell className="px-3 text-zinc-800">{typeLabel[document.type]}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{document.locale.toUpperCase()}</TableCell>
                    <TableCell className="px-3 font-medium text-zinc-900">{document.title || "-"}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{document.version}</TableCell>
                    <TableCell className="px-3">
                      <Badge variant={document.is_published ? "default" : "secondary"}>
                        {document.is_published ? "게시" : "비공개"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatDateTime(document.published_at)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatDateTime(document.updated_at)}</TableCell>
                    <TableCell className="px-3">
                      {publicPath ? (
                        <Link href={publicPath} className="text-xs text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
                          {publicPath}
                        </Link>
                      ) : (
                        <span className="text-xs text-zinc-400">-</span>
                      )}
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
