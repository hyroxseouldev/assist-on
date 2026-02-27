import Link from "next/link";

import { MessageCircle } from "lucide-react";

import { CommunityLikeButton } from "@/components/community/community-like-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { sanitizeCommunityContent } from "@/lib/sanitize/community-content";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function extractInitial(name: string) {
  const value = name.trim();
  return value.length > 0 ? value.slice(0, 1).toUpperCase() : "M";
}

export function CommunityFeedItem({
  communityBasePath,
  post,
}: {
  communityBasePath: string;
  post: {
    id: string;
    title: string;
    contentHtml: string;
    createdAt: string;
    authorName: string;
    authorAvatarUrl: string | null;
    likeCount: number;
    commentCount: number;
    likedByMe: boolean;
  };
}) {
  const detailPath = `${communityBasePath}/${post.id}`;

  return (
    <article className="border-b border-zinc-200/70 px-4 py-4 transition-colors hover:bg-zinc-50/70 sm:px-5">
      <div className="flex items-start gap-3">
        <Avatar size="lg" className="mt-0.5 size-10">
          <AvatarImage src={post.authorAvatarUrl ?? undefined} alt={`${post.authorName} 프로필`} />
          <AvatarFallback>{extractInitial(post.authorName)}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <p className="font-semibold text-zinc-900">{post.authorName}</p>
            <span className="text-zinc-400">·</span>
            <p className="text-xs text-zinc-500">{formatDate(post.createdAt)}</p>
          </div>

          <Link href={detailPath} className="block space-y-1">
            <h3 className="truncate text-[15px] font-semibold text-zinc-900">{post.title}</h3>
            <article
              className="prose prose-zinc line-clamp-4 max-w-none text-sm text-zinc-700 [&_img]:my-2 [&_img]:max-h-72 [&_img]:w-full [&_img]:rounded-lg [&_img]:object-cover [&_p]:my-1"
              dangerouslySetInnerHTML={{ __html: sanitizeCommunityContent(post.contentHtml) }}
            />
          </Link>

          <div className="flex items-center gap-2 pt-1">
            <CommunityLikeButton postId={post.id} likedByMe={post.likedByMe} likeCount={post.likeCount} />

            <Link
              href={detailPath}
              className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <MessageCircle className="size-4" />
              {post.commentCount}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
