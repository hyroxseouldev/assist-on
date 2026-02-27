import { CommunityPostEditor } from "@/components/community/community-post-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TenantCommunityNewPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">커뮤니티 글쓰기</h1>
        <p className="mt-1 text-sm text-zinc-600">훈련 기록과 경험을 자유롭게 공유하세요.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>새 게시글</CardTitle>
          <CardDescription>본문은 위지윅 편집기를 사용하며 이미지 업로드를 지원합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <CommunityPostEditor mode="create" />
        </CardContent>
      </Card>
    </section>
  );
}
