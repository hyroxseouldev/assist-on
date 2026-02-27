import Link from "next/link";
import { PenSquare } from "lucide-react";

import { CommunityFeedItem } from "@/components/community/community-feed-item";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCommunityFeed } from "@/lib/community/server";

export default async function CommunityPage() {
  const posts = await getCommunityFeed();

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-10 rounded-lg border border-zinc-200/70 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">커뮤니티</h1>
            <p className="mt-1 text-xs text-zinc-500">운동 기록, 후기, 질문을 자유롭게 공유해 보세요.</p>
          </div>

          <Button asChild size="sm">
            <Link href="/community/new">
              <PenSquare className="size-4" />
              글쓰기
            </Link>
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-zinc-200/70 bg-white/95 py-0">
        {posts.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">아직 게시글이 없습니다. 첫 글을 작성해 보세요.</div>
        ) : (
          posts.map((post) => <CommunityFeedItem key={post.id} post={post} />)
        )}
      </Card>
    </section>
  );
}
