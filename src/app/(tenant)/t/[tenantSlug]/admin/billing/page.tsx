import { BillingPage } from "@/components/admin/billing-page";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ tenantSlug }, query] = await Promise.all([params, searchParams]);
  return <BillingPage tenantSlug={tenantSlug} month={query.month} />;
}
