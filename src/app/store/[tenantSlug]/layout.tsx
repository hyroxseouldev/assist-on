import type { ReactNode } from "react";

import { TenantPublicFooter } from "@/components/navigation/tenant-public-footer";
import { TenantPublicHeader } from "@/components/navigation/tenant-public-header";
import { getTenantPublicSiteDataBySlug } from "@/lib/landing/server";

export default async function PublicStoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const siteData = await getTenantPublicSiteDataBySlug(tenantSlug);
  const brandLabel = siteData?.branding.team_name?.trim() || siteData?.tenant.name || tenantSlug;
  const logoUrl = siteData?.branding.logo_url ?? null;

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <TenantPublicHeader tenantSlug={tenantSlug} brandLabel={brandLabel} logoUrl={logoUrl} />
      {children}
      <TenantPublicFooter tenantSlug={tenantSlug} brandLabel={brandLabel} />
    </div>
  );
}
