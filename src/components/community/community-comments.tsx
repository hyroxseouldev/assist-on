"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createCommunityCommentAction, deleteCommunityCommentAction } from "@/app/actions/community";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import type { CommunityCommentItem } from "@/lib/community/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitial(name: string) {
  const value = name.trim();
  return value.length > 0 ? value.slice(0, 1).toUpperCase() : "M";
}

export function CommunityComments({ postId, comments }: { postId: string; comments: CommunityCommentItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("content", content);

    startTransition(async () => {
      const result = await createCommunityCommentAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setContent("");
      toast.success(result.message);
      router.refresh();
    });
  };

  const handleDelete = (commentId: string) => {
    const formData = new FormData();
    formData.set("postId", postId);
    formData.set("commentId", commentId);

    startTransition(async () => {
      const result = await deleteCommunityCommentAction(formData);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold text-zinc-900">댓글 {comments.length}</h2>

      <form className="space-y-2" onSubmit={handleCreate}>
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          placeholder="훈련 기록에 대한 피드백이나 질문을 남겨보세요."
          required
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isPending ? "등록 중..." : "댓글 등록"}
        </Button>
      </form>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
        ) : (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border border-zinc-200/70 bg-white px-3 py-3">
              <div className="flex items-start gap-3">
                <Avatar size="sm" className="size-8">
                  <AvatarImage src={comment.authorAvatarUrl ?? undefined} alt={`${comment.authorName} 프로필`} />
                  <AvatarFallback>{getInitial(comment.authorName)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span className="text-sm font-semibold text-zinc-900">{comment.authorName}</span>
                      <span>·</span>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>

                    {comment.canEdit ? (
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => handleDelete(comment.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>

                  <article
                    className="prose prose-zinc max-w-none text-sm [&_p]:my-1 [&_br]:my-0"
                    dangerouslySetInnerHTML={{ __html: sanitizeSessionContent(comment.contentHtml) }}
                  />
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
