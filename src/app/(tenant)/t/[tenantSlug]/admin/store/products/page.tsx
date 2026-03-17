import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramProductsManager } from "@/components/admin/program-products-manager";
import { getAdminProgramProductsPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminStoreProductsPage({
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
  const products = await getAdminProgramProductsPage(supabase, { page, pageSize });

  return (
    <AdminPageShell title="스토어 상품" description="프로그램 판매 가격과 공개 상태를 관리합니다.">
      <ProgramProductsManager
        products={products.items}
        total={products.total}
        page={products.page}
        pageSize={products.pageSize}
        totalPages={products.totalPages}
      />
    </AdminPageShell>
  );
}
