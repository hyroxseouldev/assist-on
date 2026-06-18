import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AccountDeletionGuide } from "@/components/legal/account-deletion-guide";
import { getTenantPublicSiteDataBySlug } from "@/lib/landing/server";
import { resolveTenantBrandName } from "@/lib/tenant/branding";

const SUPPORT_EMAIL = "vividxxxxx@gmail.com";
const DEVELOPER_NAME = "김선명";

type TenantDeletionOverride = {
  appName?: string;
  serviceEntity?: string;
  supportEmail?: string;
  websiteHref?: string;
};

const tenantDeletionOverrides: Record<string, TenantDeletionOverride> = {
  amor: {
    appName: "AMOR LAB",
    serviceEntity: "AMOR LAB / CLYR Training",
    websiteHref: "https://www.amorlab.kr/",
  },
  "xon-training": {
    appName: "XON TRAINING",
    serviceEntity: "XON TRAINING / CLYR Training",
    websiteHref: "https://www.instagram.com/xon_training",
  },
};

type AccountDeletePageProps = {
  params: Promise<{ tenantSlug: string }>;
};

async function getTenantDeletionPageData(tenantSlug: string) {
  const siteData = await getTenantPublicSiteDataBySlug(tenantSlug);

  if (!siteData) {
    return null;
  }

  const override = tenantDeletionOverrides[tenantSlug] ?? {};
  const brandName = resolveTenantBrandName(siteData.branding.team_name || siteData.tenant.name || tenantSlug);
  const appName = override.appName ?? brandName;
  const serviceEntity = override.serviceEntity ?? `${brandName} / CLYR Training`;
  const websiteHref = override.websiteHref;

  return {
    appName,
    developerName: DEVELOPER_NAME,
    serviceEntity,
    supportEmail: override.supportEmail ?? SUPPORT_EMAIL,
    homeHref: websiteHref ?? "/",
    websiteHref,
  };
}

export async function generateMetadata({ params }: AccountDeletePageProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  const pageData = await getTenantDeletionPageData(tenantSlug);

  if (!pageData) {
    return {
      title: "계정 및 데이터 삭제 요청",
    };
  }

  return {
    title: `${pageData.appName} 계정 및 데이터 삭제 요청`,
    description: `Google Play 등록정보에 제공되는 ${pageData.appName} 계정 및 관련 데이터 삭제 요청 안내 페이지입니다.`,
  };
}

export default async function TenantAccountDeleteGuidePage({ params }: AccountDeletePageProps) {
  const { tenantSlug } = await params;
  const pageData = await getTenantDeletionPageData(tenantSlug);

  if (!pageData) {
    notFound();
  }

  return (
    <AccountDeletionGuide
      appName={pageData.appName}
      developerName={pageData.developerName}
      serviceEntity={pageData.serviceEntity}
      supportEmail={pageData.supportEmail}
      homeHref={pageData.homeHref}
      websiteHref={pageData.websiteHref}
    />
  );
}
