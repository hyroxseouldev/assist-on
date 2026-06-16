import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LocationsList } from "@/components/admin/locations-list";
import { getAdminLocationsPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminLocationsPage({
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
  const locations = await getAdminLocationsPage(supabase, tenantSlug, { page, pageSize });

  return (
    <AdminPageShell title="지점 관리" description="매장과 지점의 주소, 이미지, 지도, 편의시설을 관리합니다.">
      <LocationsList
        locations={locations.items}
        total={locations.total}
        page={locations.page}
        pageSize={locations.pageSize}
        totalPages={locations.totalPages}
      />
    </AdminPageShell>
  );
}
