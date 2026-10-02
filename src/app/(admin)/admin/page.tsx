import { DashboardPage } from "@/components/admin/dashboard-page";
import { getCurrentAdminTenantSlug } from "@/lib/admin/current";

export default async function TenantAdminHomePage() {
  const tenantSlug = await getCurrentAdminTenantSlug();
  return <DashboardPage tenantSlug={tenantSlug} basePath="/admin" />;
}
