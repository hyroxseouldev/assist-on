import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { NoticesList } from "@/components/admin/notices-list";
import { getAdminNoticesPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminNoticesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const notices = await getAdminNoticesPage(supabase, tenantSlug, { page, pageSize });

  return (
    <AdminPageShell title="공지사항" description="리스트에서 공지를 선택해 수정하거나 새 공지를 등록합니다.">
      <NoticesList
        notices={notices.items}
        total={notices.total}
        page={notices.page}
        pageSize={notices.pageSize}
        totalPages={notices.totalPages}
      />
    </AdminPageShell>
  );
}
