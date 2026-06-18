import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { notFound } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BookingServiceEditForm } from "@/components/admin/booking-service-edit-form";
import { getAdminBookingServiceById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminBookingServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const [{ id }, tenantSlug] = await Promise.all([params, getCurrentAdminTenantSlug()]);
  const { supabase } = await requireAdminUser(tenantSlug);
  const service = await getAdminBookingServiceById(supabase, tenantSlug, id);

  if (!service) {
    notFound();
  }

  return (
    <AdminPageShell title="예약 서비스 수정" description="서비스 기본 정보, 옵션, 슬롯을 관리합니다.">
      <BookingServiceEditForm service={service} />
    </AdminPageShell>
  );
}
