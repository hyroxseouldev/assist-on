import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft, MessageCircle } from "lucide-react";

import { CommunityComments } from "@/components/community/community-comments";
import { CommunityLikeButton } from "@/components/community/community-like-button";
import { CommunityPostManageActions } from "@/components/community/community-post-manage-actions";
import { CommunityPostReportForm } from "@/components/community/community-post-report-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommunityPostDetail } from "@/lib/community/server";
import { sanitizeCommunityContent } from "@/lib/sanitize/community-content";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
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

export default async function TenantCommunityPostDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; postId: string }>;
}) {
  const { tenantSlug, postId } = await params;
  const communityBasePath = `/t/${tenantSlug}/community`;
  const post = await getCommunityPostDetail(postId);

  if (!post) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={communityBasePath}>
            <ChevronLeft className="size-4" />
            목록으로
          </Link>
        </Button>

        {post.canEdit ? <CommunityPostManageActions postId={post.id} /> : null}
      </div>

      <Card className="border-zinc-200/70 bg-white/95">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar size="lg" className="size-11">
              <AvatarImage src={post.authorAvatarUrl ?? undefined} alt={`${post.authorName} 프로필`} />
              <AvatarFallback>{getInitial(post.authorName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-zinc-900">{post.authorName}</p>
              <p className="text-xs text-zinc-500">{formatDate(post.createdAt)}</p>
            </div>
          </div>

          <CardTitle className="text-2xl leading-tight tracking-tight">{post.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <article
            className="prose prose-zinc max-w-none [&_img]:my-3 [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover"
            dangerouslySetInnerHTML={{ __html: sanitizeCommunityContent(post.contentHtml) }}
          />

          <div className="flex items-center gap-3 border-t border-zinc-200/70 pt-3">
            <CommunityLikeButton postId={post.id} likedByMe={post.likedByMe} likeCount={post.likeCount} />
            <div className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-500">
              <MessageCircle className="size-4" />
              {post.commentCount}
            </div>
            {!post.canEdit ? <CommunityPostReportForm postId={post.id} /> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200/70 bg-white/95">
        <CardContent className="pt-6">
          <CommunityComments postId={post.id} comments={post.comments} />
        </CardContent>
      </Card>
    </section>
  );
}
