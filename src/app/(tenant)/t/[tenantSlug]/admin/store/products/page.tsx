import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramProductsManager } from "@/components/admin/program-products-manager";
import { getAdminProgramProducts, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminStoreProductsPage() {
  const { supabase } = await requireAdminUser();
  const products = await getAdminProgramProducts(supabase);

  return (
    <AdminPageShell title="스토어 상품" description="프로그램 판매 가격과 공개 상태를 관리합니다.">
      <ProgramProductsManager products={products} />
    </AdminPageShell>
  );
}
