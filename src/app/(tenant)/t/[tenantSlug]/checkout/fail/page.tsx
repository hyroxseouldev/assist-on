import { redirect } from "next/navigation";

export default async function LegacyCheckoutFailRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  const { tenantSlug } = await params;
  const { code, message } = await searchParams;

  const query = new URLSearchParams();
  if (code) query.set("code", code);
  if (message) query.set("message", message);
  const next = query.toString();

  redirect(next ? `/store/${tenantSlug}/checkout/fail?${next}` : `/store/${tenantSlug}/checkout/fail`);
}
