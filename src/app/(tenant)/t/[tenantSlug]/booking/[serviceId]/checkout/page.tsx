import { redirect } from "next/navigation";

import { BookingCheckoutForm } from "@/components/booking/booking-checkout-form";
import { getBookingCheckoutContext } from "@/lib/booking/server";
import { getTenantBookingServicePath } from "@/lib/booking/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatSlotLabel(startsAt: string, endsAt: string) {
  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateFormatter.format(new Date(startsAt))} - ${timeFormatter.format(new Date(endsAt))}`;
}

export default async function TenantBookingCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; serviceId: string }>;
  searchParams: Promise<{ optionId?: string; slotId?: string }>;
}) {
  const { tenantSlug, serviceId } = await params;
  const { optionId, slotId } = await searchParams;
  const servicePath = getTenantBookingServicePath(tenantSlug, serviceId);

  if (!optionId || !slotId) {
    redirect(servicePath);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`${servicePath}/checkout?optionId=${optionId}&slotId=${slotId}`)}&tenant=${encodeURIComponent(tenantSlug)}`);
  }

  const [context, profileResult] = await Promise.all([
    getBookingCheckoutContext({ tenantSlug, serviceId, optionId, slotId }),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle<{ full_name: string | null }>(),
  ]);

  if (!context) {
    redirect(servicePath);
  }

  const initialBookerName =
    profileResult.data?.full_name?.trim() ||
    (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    user.email ||
    "회원";

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <BookingCheckoutForm
        tenantSlug={tenantSlug}
        serviceId={serviceId}
        optionId={optionId}
        slotId={slotId}
        serviceName={context.service.name}
        optionName={context.option.name}
        optionDescription={context.option.description}
        priceKrw={context.option.priceKrw}
        userEmail={user.email ?? ""}
        initialBookerName={initialBookerName}
        slotLabel={formatSlotLabel(context.slot.startsAt, context.slot.endsAt)}
        legalContent={context.legalContent}
      />
    </main>
  );
}
