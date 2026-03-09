import { redirect } from "next/navigation";

export default async function LegacyCheckoutFailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ flow?: string; orderId?: string; code?: string; message?: string; productId?: string }>;
}) {
  const { tenantSlug } = await params;
  const { flow, orderId, code, message, productId } = await searchParams;

  const query = new URLSearchParams();
  if (flow) query.set("flow", flow);
  if (orderId) query.set("orderId", orderId);
  if (code) query.set("code", code);
  if (message) query.set("message", message);
  if (productId) query.set("productId", productId);
  const next = query.toString();

  redirect(next ? `/store/${tenantSlug}/checkout/fail?${next}` : `/store/${tenantSlug}/checkout/fail`);
}
