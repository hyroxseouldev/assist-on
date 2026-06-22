"use client";

import { ExternalLink } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
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
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { useTenantBasePath } from "@/hooks/use-tenant-base-path";
import { formatAdminDateTime } from "@/lib/admin/format";
import type { YoutubeContentRow } from "@/lib/admin/types";

type YoutubeContentsListProps = {
  contents: YoutubeContentRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function getYoutubeThumbnailUrl(content: YoutubeContentRow) {
  return content.thumbnail_url || `https://img.youtube.com/vi/${content.youtube_video_id}/hqdefault.jpg`;
}

export function YoutubeContentsList({ contents, total, page, pageSize, totalPages }: YoutubeContentsListProps) {
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantBasePath = useTenantBasePath();
  const contentsPath = `${tenantBasePath}/admin/youtube`;
  const contentCreatePath = `${contentsPath}/new`;

  const summaryText = useMemo(() => {
    if (total === 0) return "등록된 유튜브 콘텐츠가 없습니다.";
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
          <Button onClick={() => push(contentCreatePath)}>새 영상 등록</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <Table>
          <TableHeader className="bg-zinc-50 text-zinc-600">
            <TableRow>
              <TableHead className="px-3">썸네일</TableHead>
              <TableHead className="px-3">제목</TableHead>
              <TableHead className="px-3">장르</TableHead>
              <TableHead className="px-3">태그</TableHead>
              <TableHead className="px-3">정렬</TableHead>
              <TableHead className="px-3">모바일 공개</TableHead>
              <TableHead className="px-3">미리보기 영상</TableHead>
              <TableHead className="px-3">생성일</TableHead>
              <TableHead className="px-3">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                  등록된 유튜브 콘텐츠가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              contents.map((content) => {
                const thumbnailUrl = getYoutubeThumbnailUrl(content);

                return (
                  <TableRow
                    key={content.id}
                    className="cursor-pointer"
                    onClick={() => push(`${contentsPath}/${content.id}`)}
                  >
                    <TableCell className="px-3">
                      <div
                        aria-label={`${content.title} 썸네일`}
                        className="aspect-video w-20 overflow-hidden rounded-md border border-zinc-200 bg-cover bg-center bg-white"
                        role="img"
                        style={{ backgroundImage: `url(${JSON.stringify(thumbnailUrl)})` }}
                      />
                    </TableCell>
                    <TableCell className="px-3">
                      <p className="font-medium text-zinc-900">{content.title}</p>
                      {content.description ? <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{content.description}</p> : null}
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{content.genre || "-"}</TableCell>
                    <TableCell className="px-3">
                      {content.tags.length > 0 ? (
                        <div className="flex max-w-52 flex-wrap gap-1">
                          {content.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                          {content.tags.length > 3 ? <span className="text-xs text-zinc-500">+{content.tags.length - 3}</span> : null}
                        </div>
                      ) : (
                        <span className="text-zinc-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{content.display_order}</TableCell>
                    <TableCell className="px-3">
                      <Badge variant={content.mobile_visibility === "public" ? "default" : "secondary"}>
                        {content.mobile_visibility === "public" ? "공개" : "비공개"}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3" onClick={(event) => event.stopPropagation()}>
                      {content.preview_video_url ? (
                        <Button type="button" variant="outline" size="sm" asChild>
                          <a href={content.preview_video_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-4" />
                            있음
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="secondary">없음</Badge>
                      )}
                    </TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(content.created_at)}</TableCell>
                    <TableCell className="px-3 text-zinc-700">{formatAdminDateTime(content.updated_at)}</TableCell>
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
