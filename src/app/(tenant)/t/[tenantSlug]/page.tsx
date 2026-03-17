import { notFound } from "next/navigation";

import { TenantUserLanding } from "@/components/landing/tenant-user-landing";
import { getTenantMarketingLandingDataBySlug } from "@/lib/landing/server";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const landingData = await getTenantMarketingLandingDataBySlug(tenantSlug);

  if (!landingData) {
    notFound();
  }

  return <TenantUserLanding data={landingData} />;
}
