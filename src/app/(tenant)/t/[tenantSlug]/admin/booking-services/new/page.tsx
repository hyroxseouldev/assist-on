import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { BookingServiceCreateForm } from "@/components/admin/booking-service-create-form";
import { requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminBookingServiceNewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  await requireAdminUser(tenantSlug);

  return (
    <AdminPageShell title="예약 서비스 등록" description="예약 서비스 기본 정보만 먼저 등록합니다.">
      <BookingServiceCreateForm />
    </AdminPageShell>
  );
}
