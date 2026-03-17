import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TenantUserLanding } from "@/components/landing/tenant-user-landing";
import { getTenantMarketingLandingDataBySlug } from "@/lib/landing/server";
import { buildTenantMetadata } from "@/lib/tenant/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;

  return buildTenantMetadata({
    tenantSlug,
    pageTitle: "홈",
  });
}

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
