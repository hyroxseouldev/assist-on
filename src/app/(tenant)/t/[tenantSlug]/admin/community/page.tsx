import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { CommunityManager } from "@/components/admin/community-manager";
import { getAdminCommunityPosts, getAdminCommunityReports, requireAdminUser } from "@/lib/admin/server";
import type { CommunityPostStatus, CommunityReportStatus } from "@/lib/admin/types";

function parsePostStatus(value: string | undefined): CommunityPostStatus | "all" {
  if (value === "published" || value === "hidden" || value === "deleted") {
    return value;
  }

  return "all";
}

function parseReportStatus(value: string | undefined): CommunityReportStatus | "all" {
  if (value === "open" || value === "resolved" || value === "rejected") {
    return value;
  }

  return "all";
}

export default async function TenantAdminCommunityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdminUser();

  const postStatus = parsePostStatus(typeof params.postStatus === "string" ? params.postStatus : undefined);
  const reportStatus = parseReportStatus(typeof params.reportStatus === "string" ? params.reportStatus : undefined);

  const [posts, reports] = await Promise.all([
    getAdminCommunityPosts(supabase, postStatus),
    getAdminCommunityReports(supabase, reportStatus),
  ]);

  return (
    <AdminPageShell title="커뮤니티 관리" description="게시글 숨김/삭제와 신고 처리를 관리합니다.">
      <CommunityManager posts={posts} reports={reports} />
    </AdminPageShell>
  );
}
