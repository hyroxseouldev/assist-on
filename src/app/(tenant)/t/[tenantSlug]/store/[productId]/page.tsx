import { redirect } from "next/navigation";

export default async function TenantStoreProductRedirectPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; productId: string }>;
}) {
  const { tenantSlug, productId } = await params;
  redirect(`/store/${tenantSlug}/${productId}`);
}
