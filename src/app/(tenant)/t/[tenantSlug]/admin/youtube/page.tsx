import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { YoutubeContentsList } from "@/components/admin/youtube-contents-list";
import { getAdminYoutubeContentsPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminYoutubeContentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const contents = await getAdminYoutubeContentsPage(supabase, tenantSlug, { page, pageSize });

  return (
    <AdminPageShell title="유튜브" description="모바일 앱에 표시할 유튜브 링크 콘텐츠를 관리합니다.">
      <YoutubeContentsList
        contents={contents.items}
        total={contents.total}
        page={contents.page}
        pageSize={contents.pageSize}
        totalPages={contents.totalPages}
      />
    </AdminPageShell>
  );
}
