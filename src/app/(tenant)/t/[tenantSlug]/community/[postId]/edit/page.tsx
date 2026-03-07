import { notFound, redirect } from "next/navigation";

import { CommunityPostEditor } from "@/components/community/community-post-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommunityPostDetail } from "@/lib/community/server";

export default async function TenantCommunityPostEditPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; postId: string }>;
}) {
  const { tenantSlug, postId } = await params;
  const post = await getCommunityPostDetail(postId);

  if (!post) {
    notFound();
  }

  if (!post.canEdit) {
    redirect(`/t/${tenantSlug}/community/${postId}`);
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">게시글 수정</h1>
        <p className="mt-1 text-sm text-zinc-600">내용을 업데이트하고 다시 공유하세요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>게시글 편집</CardTitle>
          <CardDescription>제목과 본문을 수정할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <CommunityPostEditor mode="edit" postId={post.id} initialTitle={post.title} initialContentHtml={post.contentHtml} />
        </CardContent>
      </Card>
    </section>
  );
}
