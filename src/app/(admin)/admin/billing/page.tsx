import { BillingPage } from "@/components/admin/billing-page";
import { getCurrentAdminTenantSlug } from "@/lib/admin/current";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [tenantSlug, params] = await Promise.all([
    getCurrentAdminTenantSlug(),
    searchParams,
  ]);
  return <BillingPage tenantSlug={tenantSlug} month={params.month} />;
}
