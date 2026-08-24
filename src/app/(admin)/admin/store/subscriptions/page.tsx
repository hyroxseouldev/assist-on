import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SubscriptionsList } from "@/components/admin/subscriptions-list";
import { getAdminSubscriptionsPage, requireAdminUser } from "@/lib/admin/server";
import type { AdminSubscriptionStatusFilter } from "@/lib/admin/types";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseSubscriptionStatus(value: string | undefined): AdminSubscriptionStatusFilter {
  if (value === "incomplete" || value === "active" || value === "past_due" || value === "canceled") {
    return value;
  }

  return "all";
}

export default async function TenantAdminStoreSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);

  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "";
  const status = parseSubscriptionStatus(typeof resolvedSearchParams.status === "string" ? resolvedSearchParams.status : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const subscriptions = await getAdminSubscriptionsPage(supabase, tenantSlug, { query, status, page, pageSize });

  return (
    <AdminPageShell title="구독" description="회원별 구독 상태와 결제 주기를 확인합니다.">
      <SubscriptionsList
        subscriptions={subscriptions.items}
        total={subscriptions.total}
        page={subscriptions.page}
        pageSize={subscriptions.pageSize}
        totalPages={subscriptions.totalPages}
        query={query}
        status={subscriptions.status}
      />
    </AdminPageShell>
  );
}
