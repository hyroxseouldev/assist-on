import { notFound } from "next/navigation";

import { BookingServiceDetail } from "@/components/booking/booking-service-detail";
import { getPublicBookingServiceDetail } from "@/lib/booking/server";

export default async function TenantBookingServicePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; serviceId: string }>;
}) {
  const { tenantSlug, serviceId } = await params;
  const detail = await getPublicBookingServiceDetail({ tenantSlug, serviceId });

  if (!detail) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <BookingServiceDetail
        tenantSlug={tenantSlug}
        serviceId={serviceId}
        serviceName={detail.service.name}
        serviceDescription={detail.service.description}
        options={detail.options}
        slots={detail.slots}
      />
    </main>
  );
}
