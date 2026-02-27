import { redirect } from "next/navigation";

export default async function LegacyCheckoutSuccessRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }>;
}) {
  const { tenantSlug } = await params;
  const { paymentKey, orderId, amount } = await searchParams;

  const query = new URLSearchParams();
  if (paymentKey) query.set("paymentKey", paymentKey);
  if (orderId) query.set("orderId", orderId);
  if (amount) query.set("amount", amount);
  const next = query.toString();

  redirect(next ? `/store/${tenantSlug}/checkout/success?${next}` : `/store/${tenantSlug}/checkout/success`);
}
