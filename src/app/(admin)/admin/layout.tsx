import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";
import { getCurrentAdminTenantSlug } from "@/lib/admin/current";

export default async function TenantAdminLayout({ children }: { children: React.ReactNode }) {
  const tenantSlug = await getCurrentAdminTenantSlug();

  return <AdminLayoutShell tenantSlug={tenantSlug}>{children}</AdminLayoutShell>;
}
