import { redirect } from "next/navigation";

export default async function TenantStoreRedirectPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  redirect(`/store/${tenantSlug}`);
}
