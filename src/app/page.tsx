import type { Metadata } from "next";
import { Bebas_Neue, Noto_Sans_KR } from "next/font/google";

import { HyroxCoachLanding } from "@/components/landing/hyrox-coach-landing";
import { TenantMarketingLanding } from "@/components/landing/tenant-marketing-landing";
import { PublicHeader } from "@/components/navigation/public-header";
import { PublicLegalFooter } from "@/components/navigation/public-legal-footer";
import { getMarketingTenantId } from "@/lib/env/server";
import { getTenantMarketingLandingDataByTenantId } from "@/lib/landing/server";
import { DEFAULT_TENANT_SLUG } from "@/lib/tenant/server";

const headingFont = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
});

const bodyFont = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "코치 운영을 위한 테넌트 랜딩 | Assist On",
  description: "테넌트 브랜딩과 상품 정보를 기반으로 운영되는 화이트라벨 마케팅 랜딩 페이지.",
};

export default async function LandingHomePage() {
  const marketingTenantId = getMarketingTenantId();
  const marketingLandingData = marketingTenantId
    ? await getTenantMarketingLandingDataByTenantId(marketingTenantId)
    : null;
  const tenantSlug = marketingLandingData?.tenant.slug ?? DEFAULT_TENANT_SLUG;

  return (
    <div className={`${headingFont.variable} ${bodyFont.variable} font-[family-name:var(--font-body)]`}>
      <PublicHeader />
      {marketingLandingData ? <TenantMarketingLanding data={marketingLandingData} /> : <HyroxCoachLanding />}
      <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <PublicLegalFooter tenantSlug={tenantSlug} />
      </div>
    </div>
  );
}
