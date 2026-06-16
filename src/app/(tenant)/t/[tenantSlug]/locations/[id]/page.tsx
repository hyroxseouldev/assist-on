import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicLocationDetail } from "@/components/locations/public-location-detail";
import { getPublicLocationById } from "@/lib/locations/server";
import { buildTenantMetadata } from "@/lib/tenant/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}): Promise<Metadata> {
  const { tenantSlug, id } = await params;
  const data = await getPublicLocationById({ tenantSlug, locationId: id });

  return buildTenantMetadata({
    tenantSlug,
    pageTitle: data?.location.name ?? "지점 안내",
    description: data?.location.description || data?.location.address || "지점 정보를 확인하세요.",
  });
}

export default async function TenantLocationDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const data = await getPublicLocationById({ tenantSlug, locationId: id });

  if (!data) {
    notFound();
  }

  return <PublicLocationDetail tenantSlug={data.tenant.slug} location={data.location} />;
}
