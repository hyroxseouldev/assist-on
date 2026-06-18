import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { PartnerDiscountCodesManager } from "@/components/admin/partner-discount-codes-manager";
import { getAdminPartnerDiscountCodesPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminPartnerDiscountsPage({
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
  const codes = await getAdminPartnerDiscountCodesPage(supabase, tenantSlug, { page, pageSize });

  return (
    <AdminPageShell title="제휴 할인 코드" description="회원에게 제공할 외부 제휴 할인 코드와 모바일 공개 상태를 관리합니다.">
      <PartnerDiscountCodesManager
        codes={codes.items}
        total={codes.total}
        page={codes.page}
        pageSize={codes.pageSize}
        totalPages={codes.totalPages}
      />
    </AdminPageShell>
  );
}
