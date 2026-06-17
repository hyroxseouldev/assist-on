"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FormEvent } from "react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  createAdminCommunityCommentAction,
  getAdminCommunityPostDetailAction,
  setAdminCommunityCommentStatusAction,
  setCommunityPostStatusAction,
} from "@/lib/admin/actions";
import { useAdminNavigation } from "@/components/admin/admin-navigation-feedback";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTenantSlug } from "@/hooks/use-tenant-slug";
import { formatAdminDateTime } from "@/lib/admin/format";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { sanitizeCommunityContent } from "@/lib/sanitize/community-content";
import type { AdminCommunityCommentRow, AdminCommunityPostRow, CommunityPostStatus } from "@/lib/admin/types";

type CommunityPostsManagerProps = {
  items: AdminCommunityPostRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  status: CommunityPostStatus | "all";
};

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
  const isMobile = useIsMobile();
  const [isPending, startTransition] = useTransition();
  const [isDetailPending, startDetailTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query);
  const [selectedPost, setSelectedPost] = useState<AdminCommunityPostRow | null>(null);
  const [selectedPostContentHtml, setSelectedPostContentHtml] = useState("");
  const [selectedPostImages, setSelectedPostImages] = useState<string[]>([]);
  const [selectedPostComments, setSelectedPostComments] = useState<AdminCommunityCommentRow[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const router = useRouter();
  const { push } = useAdminNavigation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tenantSlug = useTenantSlug();

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
    formData.set("tenantSlug", tenantSlug ?? "");
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
    setSelectedPostComments([]);
    setCommentContent("");

    startDetailTransition(async () => {
      const result = await getAdminCommunityPostDetailAction(tenantSlug ?? "", post.id);
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
          comment_count: item.comments.length,
        };
      });
      setSelectedPostContentHtml(item.contentHtml);
      setSelectedPostImages(item.images);
      setSelectedPostComments(item.comments);
    });
  };

  const handleCreateComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedPost) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("postId", selectedPost.id);
    formData.set("content", commentContent);

    startTransition(async () => {
      const result = await createAdminCommunityCommentAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setCommentContent("");
      toast.success(result.message);
      handleOpenPostDetail(selectedPost);
      router.refresh();
    });
  };

  const handleSetCommentStatus = (commentId: string, nextStatus: CommunityPostStatus) => {
    if (!selectedPost) {
      return;
    }

    const formData = new FormData();
    formData.set("tenantSlug", tenantSlug ?? "");
    formData.set("postId", selectedPost.id);
    formData.set("commentId", commentId);
    formData.set("nextStatus", nextStatus);

    startTransition(async () => {
      const result = await setAdminCommunityCommentStatusAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      handleOpenPostDetail(selectedPost);
      router.refresh();
    });
  };

  const sanitizedDetailHtml = sanitizeCommunityContent(selectedPostContentHtml);
  const canRenderDetailHtml = hasRenderableContent(sanitizedDetailHtml);
  const handleSelectedPostOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedPost(null);
      setSelectedPostContentHtml("");
      setSelectedPostImages([]);
      setSelectedPostComments([]);
      setCommentContent("");
    }
  };

  const postDetailContent = selectedPost ? (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="space-y-6 text-sm">
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
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setPreviewImageUrl(url)}
                    className="relative block aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50"
                  >
                    <Image src={url} alt={`게시글 이미지 ${index + 1}`} fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-3 border-t border-zinc-200 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-zinc-900">댓글 {selectedPostComments.length}</h3>
              <p className="text-xs text-zinc-500">시트 안에서 댓글 작성과 상태 관리가 가능합니다.</p>
            </div>

            <form className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3" onSubmit={handleCreateComment}>
              <Textarea
                value={commentContent}
                onChange={(event) => setCommentContent(event.target.value)}
                rows={3}
                placeholder="관리자 댓글을 남겨보세요."
                required
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {isPending ? "등록 중..." : "댓글 등록"}
                </Button>
              </div>
            </form>

            {selectedPostComments.length === 0 ? (
              <div className="rounded-md border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
                아직 댓글이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedPostComments.map((comment) => (
                  <article key={comment.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-8 border border-zinc-200">
                        <AvatarImage src={comment.author_avatar_url ?? undefined} alt={`${comment.author_name} 프로필`} />
                        <AvatarFallback>{getInitial(comment.author_name)}</AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                            <span className="text-sm font-semibold text-zinc-900">{comment.author_name}</span>
                            <span>·</span>
                            <span>{formatAdminDateTime(comment.created_at)}</span>
                            <Badge variant={comment.status === "published" ? "default" : "secondary"}>{postStatusLabel[comment.status]}</Badge>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {comment.status !== "published" ? (
                              <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleSetCommentStatus(comment.id, "published")}>
                                공개
                              </Button>
                            ) : null}
                            {comment.status !== "hidden" ? (
                              <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleSetCommentStatus(comment.id, "hidden")}>
                                숨김
                              </Button>
                            ) : null}
                            {comment.status !== "deleted" ? (
                              <Button size="sm" variant="destructive" disabled={isPending} onClick={() => handleSetCommentStatus(comment.id, "deleted")}>
                                삭제
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <article
                          className="prose prose-zinc max-w-none text-sm [&_p]:my-1 [&_br]:my-0"
                          dangerouslySetInnerHTML={{ __html: sanitizeSessionContent(comment.content_html) }}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200 p-4 sm:px-6">
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => handleSelectedPostOpenChange(false)}>
            닫기
          </Button>
        </div>
      </div>
    </>
  ) : null;

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
                  <TableCell className="px-3 text-xs text-zinc-500">{formatAdminDateTime(post.created_at)}</TableCell>
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

      {isMobile ? (
        <Drawer open={Boolean(selectedPost)} onOpenChange={handleSelectedPostOpenChange}>
          <DrawerContent className="max-h-[92vh] gap-0 p-0">
            <DrawerHeader className="border-b border-zinc-200 pr-12">
              <DrawerTitle>{selectedPost?.title ?? "게시글 상세"}</DrawerTitle>
              <DrawerDescription>
                {selectedPost ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar className="size-6 border border-zinc-200">
                      <AvatarImage src={selectedPost.author_avatar_url ?? undefined} alt={`${selectedPost.author_name} 프로필`} />
                      <AvatarFallback>{getInitial(selectedPost.author_name)}</AvatarFallback>
                    </Avatar>
                    <span>
                      {selectedPost.author_name} · {formatAdminDateTime(selectedPost.created_at)}
                    </span>
                  </span>
                ) : (
                  ""
                )}
              </DrawerDescription>
            </DrawerHeader>
            {postDetailContent}
            <DrawerFooter className="hidden" />
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedPost)} onOpenChange={handleSelectedPostOpenChange}>
          <SheetContent className="w-full gap-0 p-0 sm:max-w-4xl">
            <SheetHeader className="border-b border-zinc-200 pr-12">
              <SheetTitle>{selectedPost?.title ?? "게시글 상세"}</SheetTitle>
              <SheetDescription>
                {selectedPost ? (
                  <span className="inline-flex items-center gap-2">
                    <Avatar className="size-6 border border-zinc-200">
                      <AvatarImage src={selectedPost.author_avatar_url ?? undefined} alt={`${selectedPost.author_name} 프로필`} />
                      <AvatarFallback>{getInitial(selectedPost.author_name)}</AvatarFallback>
                    </Avatar>
                    <span>
                      {selectedPost.author_name} · {formatAdminDateTime(selectedPost.created_at)}
                    </span>
                  </span>
                ) : (
                  ""
                )}
              </SheetDescription>
            </SheetHeader>
            {postDetailContent}
            <SheetFooter className="hidden" />
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={Boolean(previewImageUrl)} onOpenChange={(open) => (!open ? setPreviewImageUrl(null) : null)}>
        <DialogContent showCloseButton={false} className="max-w-[min(96vw,72rem)] border-none bg-transparent p-0 shadow-none">
          <DialogHeader className="sr-only">
            <DialogTitle>게시글 이미지 확대</DialogTitle>
            <DialogDescription>선택한 게시글 첨부 이미지를 크게 봅니다.</DialogDescription>
          </DialogHeader>
          {previewImageUrl ? (
            <div className="relative mx-auto aspect-[4/3] w-full max-h-[88vh] max-w-[min(96vw,72rem)] overflow-hidden rounded-2xl bg-zinc-950">
              <Image src={previewImageUrl} alt="게시글 첨부 이미지 확대" fill className="object-contain" unoptimized />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
