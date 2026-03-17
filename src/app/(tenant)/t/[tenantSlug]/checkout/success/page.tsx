import { redirect } from "next/navigation";

import { getTenantStoreCheckoutSuccessPath } from "@/lib/store/paths";

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
      productId?: string;
    }>;
}) {
  const { tenantSlug } = await params;
  const { flow, paymentKey, orderId, amount, authKey, customerKey, productId } = await searchParams;

  const query = new URLSearchParams();
  if (flow) query.set("flow", flow);
  if (paymentKey) query.set("paymentKey", paymentKey);
  if (orderId) query.set("orderId", orderId);
  if (amount) query.set("amount", amount);
  if (authKey) query.set("authKey", authKey);
  if (customerKey) query.set("customerKey", customerKey);
  if (productId) query.set("productId", productId);
  const next = query.toString();

  const target = getTenantStoreCheckoutSuccessPath(tenantSlug);
  redirect(next ? `${target}?${next}` : target);
}
