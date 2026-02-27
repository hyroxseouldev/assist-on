import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { UsersManager } from "@/components/admin/users-manager";
import { getAdminManagedUsersPage, requireAdminUser } from "@/lib/admin/server";
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

export default async function TenantAdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser();

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

  const result = await getAdminManagedUsersPage(supabase, {
    query: q,
    sortBy,
    order,
    page,
    pageSize,
  });

  return (
    <AdminPageShell title="멤버십 관리" description="테넌트 멤버 목록을 확인하고 권한 변경/제거를 관리합니다.">
      <UsersManager
        users={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        query={q}
        sortBy={sortBy}
        order={order}
      />
    </AdminPageShell>
  );
}
