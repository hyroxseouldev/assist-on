import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return <AdminLayoutShell tenantSlug={tenantSlug}>{children}</AdminLayoutShell>;
}
