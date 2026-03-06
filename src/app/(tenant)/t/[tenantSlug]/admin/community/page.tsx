import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { CommunityPostsManager } from "@/components/admin/community-posts-manager";
import { getAdminCommunityPostsPage, requireAdminUser } from "@/lib/admin/server";
import type { CommunityPostStatus } from "@/lib/admin/types";

function parsePostStatus(value: string | undefined): CommunityPostStatus | "all" {
  if (value === "published" || value === "hidden" || value === "deleted") {
    return value;
  }

  return "all";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdminUser();

  const postStatus = parsePostStatus(typeof params.postStatus === "string" ? params.postStatus : undefined);
  const query = typeof params.q === "string" ? params.q : "";
  const page = parsePositiveInt(typeof params.page === "string" ? params.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof params.pageSize === "string" ? params.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;

  const posts = await getAdminCommunityPostsPage(supabase, {
    status: postStatus,
    query,
    page,
    pageSize,
  });

  return (
    <AdminPageShell title="커뮤니티 게시글" description="게시글을 조회하고 상태(공개/숨김/삭제)를 관리합니다.">
      <CommunityPostsManager
        items={posts.items}
        total={posts.total}
        page={posts.page}
        pageSize={posts.pageSize}
        totalPages={posts.totalPages}
        query={query}
        status={postStatus}
      />
    </AdminPageShell>
  );
}
