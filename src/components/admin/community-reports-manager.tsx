"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { getAdminCommunityPostDetailAction, reviewCommunityPostReportAction } from "@/lib/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { sanitizeCommunityContent } from "@/lib/sanitize/community-content";
import type { AdminCommunityReportRow, CommunityReportStatus } from "@/lib/admin/types";

type CommunityReportsManagerProps = {
  items: AdminCommunityReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  status: CommunityReportStatus | "all";
};

function formatDate(value: string | null) {
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

const reportStatusLabel: Record<CommunityReportStatus, string> = {
  open: "대기",
  resolved: "해결",
  rejected: "기각",
};

function hasRenderableContent(html: string) {
  const plainText = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return plainText.length > 0 || html.includes("<img");
}

export function CommunityReportsManager({ items, total, page, pageSize, totalPages, query, status }: CommunityReportsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isDetailPending, startDetailTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);
  const [selectedReport, setSelectedReport] = useState<AdminCommunityReportRow | null>(null);
  const [selectedPostContentHtml, setSelectedPostContentHtml] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const communityBasePath = `${tenantBasePath}/community`;

  const summaryText = useMemo(() => {
    if (total === 0) return "검색 결과가 없습니다.";

    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `총 ${total}건 중 ${start}-${end} 표시`;
  }, [page, pageSize, total]);

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
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname);
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

  const handleSearch = () => {
    pushWithParams({ q: searchValue.trim() || null, page: "1" });
  };

  const handleStatusChange = (nextStatus: string) => {
    pushWithParams({ reportStatus: nextStatus, page: "1" });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  const handleReviewReport = (reportId: string, nextStatus: Exclude<CommunityReportStatus, "open">) => {
    const formData = new FormData();
    formData.set("reportId", reportId);
    formData.set("nextStatus", nextStatus);

    startTransition(async () => {
      const result = await reviewCommunityPostReportAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleOpenReportDetail = (report: AdminCommunityReportRow) => {
    setSelectedReport(report);
    setSelectedPostContentHtml(report.post_content_html ?? "");

    startDetailTransition(async () => {
      const result = await getAdminCommunityPostDetailAction(report.post_id);
      const item = result.item;
      if (!result.ok || !item) {
        return;
      }

      setSelectedReport((current) => {
        if (!current || current.id !== report.id) {
          return current;
        }

        return {
          ...current,
          post_title: item.title,
          post_content_html: item.contentHtml,
          post_status: item.status,
        };
      });
      setSelectedPostContentHtml(item.contentHtml);
    });
  };

  const sanitizedDetailHtml = sanitizeCommunityContent(selectedPostContentHtml);
  const canRenderDetailHtml = hasRenderableContent(sanitizedDetailHtml);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 md:grid-cols-[1fr_160px_120px]">
        <div className="flex gap-2">
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="신고 사유 검색"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSearch();
              }
            }}
          />
          <Button variant="outline" onClick={handleSearch}>
            검색
          </Button>
        </div>

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">신고 대기</SelectItem>
            <SelectItem value="resolved">해결</SelectItem>
            <SelectItem value="rejected">기각</SelectItem>
            <SelectItem value="all">전체</SelectItem>
          </SelectContent>
        </Select>

        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
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

      <p className="text-xs text-zinc-500">{summaryText}</p>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">대상 게시글</TableHead>
              <TableHead className="px-3">신고자</TableHead>
              <TableHead className="px-3">사유</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">신고일</TableHead>
              <TableHead className="px-3">처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  신고 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              items.map((report) => (
                <TableRow
                  key={report.id}
                  className="cursor-pointer"
                  onClick={() => handleOpenReportDetail(report)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenReportDetail(report);
                    }
                  }}
                >
                  <TableCell className="px-3">
                    <p className="line-clamp-2 max-w-[320px] font-medium text-zinc-900">{report.post_title}</p>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">{report.reporter_name}</TableCell>
                  <TableCell className="px-3">
                    <p className="line-clamp-2 max-w-[260px] text-zinc-700">{report.reason}</p>
                  </TableCell>
                  <TableCell className="px-3">
                    <Badge variant={report.status === "open" ? "default" : "secondary"}>{reportStatusLabel[report.status]}</Badge>
                  </TableCell>
                  <TableCell className="px-3 text-xs text-zinc-500">{formatDate(report.created_at)}</TableCell>
                  <TableCell className="px-3" onClick={(event) => event.stopPropagation()}>
                    {report.status === "open" ? (
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReviewReport(report.id, "resolved")}>
                          해결
                        </Button>
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleReviewReport(report.id, "rejected")}>
                          기각
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        {report.reviewed_by_name ? `${report.reviewed_by_name} · ` : ""}
                        {formatDate(report.reviewed_at)}
                      </p>
                    )}
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

      <Dialog
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReport(null);
            setSelectedPostContentHtml("");
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.post_title ?? "신고 상세"}</DialogTitle>
            <DialogDescription>
              {selectedReport ? `${selectedReport.reporter_name} 신고 · ${formatDate(selectedReport.created_at)}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedReport ? (
            <div className="space-y-4 text-sm">
              <div className="space-y-2 rounded-md border bg-zinc-50 p-3">
                <p className="text-xs text-zinc-500">신고 사유</p>
                <p className="text-sm text-zinc-900">{selectedReport.reason}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedReport.status === "open" ? "default" : "secondary"}>
                  {reportStatusLabel[selectedReport.status]}
                </Badge>
                {isDetailPending ? <Loader2 className="size-4 animate-spin text-zinc-500" /> : null}
                {selectedReport.status !== "open" ? (
                  <p className="text-xs text-zinc-500">
                    {selectedReport.reviewed_by_name ? `${selectedReport.reviewed_by_name} · ` : ""}
                    {formatDate(selectedReport.reviewed_at)}
                  </p>
                ) : null}
              </div>
              {canRenderDetailHtml ? (
                <article
                  className="prose prose-zinc min-h-28 max-w-none overflow-x-auto rounded-md border bg-zinc-50 p-4 [&_img]:my-3 [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover"
                  dangerouslySetInnerHTML={{ __html: sanitizedDetailHtml }}
                />
              ) : (
                <div className="rounded-md border bg-zinc-50 p-4 text-sm text-zinc-500">본문 내용이 없거나 표시할 수 없는 형식입니다.</div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <div className="flex w-full justify-between gap-2">
              <div className="flex gap-2">
                {selectedReport?.status === "open" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => selectedReport && handleReviewReport(selectedReport.id, "resolved")}
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      해결
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => selectedReport && handleReviewReport(selectedReport.id, "rejected")}
                    >
                      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      기각
                    </Button>
                  </>
                ) : null}
              </div>
              <div className="flex gap-2">
                {selectedReport ? (
                  <Button asChild variant="outline">
                    <Link href={`${communityBasePath}/${selectedReport.post_id}`} target="_blank" rel="noreferrer">
                      원문 보기
                    </Link>
                  </Button>
                ) : null}
                <Button type="button" variant="outline" onClick={() => setSelectedReport(null)}>
                  닫기
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
