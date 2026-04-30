import type { Metadata } from "next";

import { getTenantPublicSiteDataBySlug } from "@/lib/landing/server";

const TENANT_METADATA_SUFFIX = "clyrtraining";
const DEFAULT_DESCRIPTION = "오늘의 하이록스 훈련을 확인하고 실행하는 트레이닝 앱";
const DEFAULT_IMAGE_URL = "/logo.png";

type BuildTenantMetadataOptions = {
  tenantSlug: string;
  pageTitle?: string;
  description?: string;
  imageUrl?: string | null;
};

function composeTitle(parts: Array<string | undefined>) {
  return parts.filter(Boolean).join(" | ");
}

export async function getTenantMetadataContext(tenantSlug: string) {
  const siteData = await getTenantPublicSiteDataBySlug(tenantSlug);

  if (!siteData) {
    return {
      brandLabel: undefined,
      description: DEFAULT_DESCRIPTION,
      imageUrl: DEFAULT_IMAGE_URL,
    };
  }

  const brandLabel = siteData.branding.team_name?.trim() || siteData.tenant.name;
  const description =
    siteData.branding.description?.trim() ||
    siteData.branding.slogan?.trim() ||
    `${brandLabel}의 트레이닝, 스토어, 예약 서비스를 이용할 수 있는 페이지`;

  return {
    brandLabel,
    description,
    imageUrl: siteData.branding.logo_url ?? DEFAULT_IMAGE_URL,
  };
}

export async function buildTenantMetadata({
  tenantSlug,
  pageTitle,
  description,
  imageUrl,
}: BuildTenantMetadataOptions): Promise<Metadata> {
  const base = await getTenantMetadataContext(tenantSlug);
  const title = composeTitle([pageTitle, base.brandLabel, TENANT_METADATA_SUFFIX]);
  const resolvedDescription = description || base.description;
  const resolvedImageUrl = imageUrl || base.imageUrl;

  return {
    title: title || TENANT_METADATA_SUFFIX,
    description: resolvedDescription,
    openGraph: {
      title: title || TENANT_METADATA_SUFFIX,
      description: resolvedDescription,
      images: [resolvedImageUrl],
    },
    twitter: {
      card: "summary_large_image",
      title: title || TENANT_METADATA_SUFFIX,
      description: resolvedDescription,
      images: [resolvedImageUrl],
    },
  };
}
