import { Suspense } from "react";
import { notFound } from "next/navigation";

import { TenantPublicFooter } from "@/components/navigation/tenant-public-footer";
import { TenantPublicHeader } from "@/components/navigation/tenant-public-header";
import { getTenantPublicSiteDataBySlug } from "@/lib/landing/server";
import { resolveTenantBrandName } from "@/lib/tenant/branding";

export default async function TenantLegalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const siteData = await getTenantPublicSiteDataBySlug(tenantSlug);

  if (!siteData) {
    notFound();
  }

  const brandLabel = resolveTenantBrandName(siteData.tenant.name);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <Suspense fallback={<div className="h-16 border-b border-zinc-200/80 bg-white" />}>
        <TenantPublicHeader
          tenantId={siteData.tenant.id}
          brandLabel={brandLabel}
          logoUrl={siteData.branding.logo_url}
        />
      </Suspense>
      {children}
      <TenantPublicFooter tenantSlug={tenantSlug} brandLabel={brandLabel} />
    </div>
  );
}
