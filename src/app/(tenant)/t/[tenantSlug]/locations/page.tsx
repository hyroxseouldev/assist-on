import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicLocationsList } from "@/components/locations/public-locations-list";
import { getPublicLocationsByTenantSlug } from "@/lib/locations/server";
import { buildTenantMetadata } from "@/lib/tenant/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;

  return buildTenantMetadata({
    tenantSlug,
    pageTitle: "지점 안내",
    description: "이용 가능한 지점과 매장 정보를 확인하세요.",
  });
}

export default async function TenantLocationsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const data = await getPublicLocationsByTenantSlug(tenantSlug);

  if (!data) {
    notFound();
  }

  return <PublicLocationsList tenantSlug={data.tenant.slug} locations={data.locations} />;
}
