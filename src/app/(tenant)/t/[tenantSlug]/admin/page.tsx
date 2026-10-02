import { DashboardPage } from "@/components/admin/dashboard-page";

export default async function TenantAdminHomePage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <DashboardPage tenantSlug={tenantSlug} basePath={`/t/${tenantSlug}/admin`} />;
}
