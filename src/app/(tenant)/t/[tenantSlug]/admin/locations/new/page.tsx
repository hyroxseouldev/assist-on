import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LocationForm } from "@/components/admin/location-form";
import { requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminLocationCreatePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireAdminUser(tenantSlug);

  return (
    <AdminPageShell title="새 지점 등록" description="공개 페이지에 노출할 지점 정보를 등록합니다.">
      <LocationForm />
    </AdminPageShell>
  );
}
