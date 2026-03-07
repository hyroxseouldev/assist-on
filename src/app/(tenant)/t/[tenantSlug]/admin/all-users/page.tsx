import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AllUsersManager } from "@/components/admin/all-users-manager";
import { getAdminAllUsersPage, getTenantSessionPrograms, requireAdminUser } from "@/lib/admin/server";
import type { ManagedUserSortBy, SortOrder } from "@/lib/admin/types";

function parseSortBy(value: string | undefined): ManagedUserSortBy {
  if (value === "full_name" || value === "last_sign_in_at" || value === "created_at") {
    return value;
  }

  return "created_at";
}

function parseOrder(value: string | undefined): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminAllUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = await searchParams;
  const { supabase, isPlatformAdmin, tenantRole } = await requireAdminUser();

  const queryParam = resolvedSearchParams.q;
  const sortByParam = resolvedSearchParams.sortBy;
  const orderParam = resolvedSearchParams.order;
  const pageParam = resolvedSearchParams.page;
  const pageSizeParam = resolvedSearchParams.pageSize;

  const q = typeof queryParam === "string" ? queryParam : "";
  const sortBy = parseSortBy(typeof sortByParam === "string" ? sortByParam : undefined);
  const order = parseOrder(typeof orderParam === "string" ? orderParam : undefined);
  const page = parsePositiveInt(typeof pageParam === "string" ? pageParam : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof pageSizeParam === "string" ? pageSizeParam : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;

  const [result, programs] = await Promise.all([
    getAdminAllUsersPage(supabase, {
      query: q,
      sortBy,
      order,
      page,
      pageSize,
    }),
    getTenantSessionPrograms(supabase),
  ]);

  const canManageMembers = isPlatformAdmin || tenantRole === "owner";

  return (
    <AdminPageShell
      title="전체 유저 조회"
      description="테넌트 유저를 검색하고 상세 정보를 확인합니다. owner는 이메일로 즉시 권한 부여를 수행할 수 있습니다."
    >
      <AllUsersManager
        users={result.items}
        programs={programs}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        query={q}
        sortBy={sortBy}
        order={order}
        canManageMembers={canManageMembers}
      />
    </AdminPageShell>
  );
}
