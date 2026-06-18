import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LocationForm } from "@/components/admin/location-form";
import { getAdminLocationById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminLocationEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, tenantSlug] = await Promise.all([params, getCurrentAdminTenantSlug()]);
  const { supabase } = await requireAdminUser(tenantSlug);
  const location = await getAdminLocationById(supabase, tenantSlug, id);

  if (!location) {
    notFound();
  }

  return (
    <AdminPageShell title="지점 수정" description="지점 정보와 공개 노출 상태를 수정합니다.">
      <LocationForm location={location} />
    </AdminPageShell>
  );
}
