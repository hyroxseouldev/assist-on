"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { getAdminCommunityPostDetailAction, setCommunityPostStatusAction } from "@/lib/admin/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { AdminCommunityPostRow, CommunityPostStatus } from "@/lib/admin/types";

type CommunityPostsManagerProps = {
  items: AdminCommunityPostRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  status: CommunityPostStatus | "all";
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

const postStatusLabel: Record<CommunityPostStatus, string> = {
  published: "공개",
  hidden: "숨김",
  deleted: "삭제",
};

function getInitial(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "M";
  }

  return trimmed[0]?.toUpperCase() ?? "M";
}

function hasRenderableContent(html: string) {
  const plainText = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
  return plainText.length > 0 || html.includes("<img");
}

export function CommunityPostsManager({ items, total, page, pageSize, totalPages, query, status }: CommunityPostsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isDetailPending, startDetailTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);
  const [selectedPost, setSelectedPost] = useState<AdminCommunityPostRow | null>(null);
  const [selectedPostContentHtml, setSelectedPostContentHtml] = useState("");
  const [selectedPostImages, setSelectedPostImages] = useState<string[]>([]);
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
    pushWithParams({ postStatus: nextStatus, page: "1" });
  };

  const handlePageSizeChange = (nextPageSize: string) => {
    pushWithParams({ pageSize: nextPageSize, page: "1" });
  };

  const handleSetPostStatus = (postId: string, nextStatus: CommunityPostStatus) => {
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("nextStatus", nextStatus);

    startTransition(async () => {
      const result = await setCommunityPostStatusAction(formData);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleOpenPostDetail = (post: AdminCommunityPostRow) => {
    setSelectedPost(post);
    setSelectedPostContentHtml(post.content_html ?? "");
    setSelectedPostImages(post.images ?? []);

    startDetailTransition(async () => {
      const result = await getAdminCommunityPostDetailAction(post.id);
      const item = result.item;
      if (!result.ok || !item) {
        return;
      }

      setSelectedPost((current) => {
        if (!current || current.id !== post.id) {
          return current;
        }

        return {
          ...current,
          title: item.title,
          status: item.status,
          created_at: item.createdAt,
          author_name: item.authorName,
          author_avatar_url: item.authorAvatarUrl,
        };
      });
      setSelectedPostContentHtml(item.contentHtml);
      setSelectedPostImages(item.images);
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
            placeholder="제목/본문 검색"
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
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="published">공개</SelectItem>
            <SelectItem value="hidden">숨김</SelectItem>
            <SelectItem value="deleted">삭제</SelectItem>
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
              <TableHead className="px-3">게시글</TableHead>
              <TableHead className="px-3">작성자</TableHead>
              <TableHead className="px-3">반응</TableHead>
              <TableHead className="px-3">상태</TableHead>
              <TableHead className="px-3">작성일</TableHead>
              <TableHead className="px-3">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                  게시글이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              items.map((post) => (
                <TableRow
                  key={post.id}
                  className="cursor-pointer"
                  onClick={() => handleOpenPostDetail(post)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleOpenPostDetail(post);
                    }
                  }}
                >
                  <TableCell className="px-3">
                    <p className="line-clamp-2 max-w-[360px] font-medium text-zinc-900">{post.title}</p>
                  </TableCell>
                  <TableCell className="px-3 text-zinc-700">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 border border-zinc-200">
                        <AvatarImage src={post.author_avatar_url ?? undefined} alt={`${post.author_name} 프로필`} />
                        <AvatarFallback>{getInitial(post.author_name)}</AvatarFallback>
                      </Avatar>
                      <span>{post.author_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 text-xs text-zinc-600">좋아요 {post.like_count} · 댓글 {post.comment_count}</TableCell>
                  <TableCell className="px-3">
                    <Badge variant={post.status === "published" ? "default" : "secondary"}>{postStatusLabel[post.status]}</Badge>
                  </TableCell>
                  <TableCell className="px-3 text-xs text-zinc-500">{formatDate(post.created_at)}</TableCell>
                  <TableCell className="px-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex flex-wrap gap-1">
                      {post.status !== "published" ? (
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleSetPostStatus(post.id, "published")}>
                          공개
                        </Button>
                      ) : null}
                      {post.status !== "hidden" ? (
                        <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleSetPostStatus(post.id, "hidden")}>
                          숨김
                        </Button>
                      ) : null}
                      {post.status !== "deleted" ? (
                        <Button size="sm" variant="destructive" disabled={isPending} onClick={() => handleSetPostStatus(post.id, "deleted")}>
                          삭제
                        </Button>
                      ) : null}
                    </div>
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
        open={Boolean(selectedPost)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPost(null);
            setSelectedPostContentHtml("");
            setSelectedPostImages([]);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title ?? "게시글 상세"}</DialogTitle>
            <DialogDescription>
              {selectedPost ? (
                <span className="inline-flex items-center gap-2">
                  <Avatar className="size-6 border border-zinc-200">
                    <AvatarImage src={selectedPost.author_avatar_url ?? undefined} alt={`${selectedPost.author_name} 프로필`} />
                    <AvatarFallback>{getInitial(selectedPost.author_name)}</AvatarFallback>
                  </Avatar>
                  <span>
                    {selectedPost.author_name} · {formatDate(selectedPost.created_at)}
                  </span>
                </span>
              ) : (
                ""
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedPost ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={selectedPost.status === "published" ? "default" : "secondary"}>{postStatusLabel[selectedPost.status]}</Badge>
                <p className="text-xs text-zinc-500">좋아요 {selectedPost.like_count} · 댓글 {selectedPost.comment_count}</p>
                {isDetailPending ? <Loader2 className="size-4 animate-spin text-zinc-500" /> : null}
              </div>
              {canRenderDetailHtml ? (
                <article
                  className="prose prose-zinc min-h-28 max-w-none overflow-x-auto rounded-md border bg-zinc-50 p-4 [&_img]:my-3 [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover"
                  dangerouslySetInnerHTML={{ __html: sanitizedDetailHtml }}
                />
              ) : (
                <div className="rounded-md border bg-zinc-50 p-4 text-sm text-zinc-500">본문 내용이 없거나 표시할 수 없는 형식입니다.</div>
              )}

              {selectedPostImages.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">첨부 이미지 ({selectedPostImages.length})</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                    {selectedPostImages.map((url, index) => (
                      <Link
                        key={`${url}-${index}`}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="relative block aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50"
                      >
                        <Image src={url} alt={`게시글 이미지 ${index + 1}`} fill className="object-cover" unoptimized />
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <div className="flex w-full justify-end gap-2">
              {selectedPost ? (
                <Button asChild variant="outline">
                  <Link href={`${communityBasePath}/${selectedPost.id}`} target="_blank" rel="noreferrer">
                    원문 보기
                  </Link>
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setSelectedPost(null)}>
                닫기
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
