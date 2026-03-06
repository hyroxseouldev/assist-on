import { redirect } from "next/navigation";

export default async function LegacyCheckoutSuccessRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    flow?: string;
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    authKey?: string;
    customerKey?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const { flow, paymentKey, orderId, amount, authKey, customerKey } = await searchParams;

  const query = new URLSearchParams();
  if (flow) query.set("flow", flow);
  if (paymentKey) query.set("paymentKey", paymentKey);
  if (orderId) query.set("orderId", orderId);
  if (amount) query.set("amount", amount);
  if (authKey) query.set("authKey", authKey);
  if (customerKey) query.set("customerKey", customerKey);
  const next = query.toString();

  redirect(next ? `/store/${tenantSlug}/checkout/success?${next}` : `/store/${tenantSlug}/checkout/success`);
}
