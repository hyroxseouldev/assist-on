import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LocationForm } from "@/components/admin/location-form";
import { getAdminLocationById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminLocationEditPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
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
