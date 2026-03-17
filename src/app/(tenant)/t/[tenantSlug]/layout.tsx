import { notFound } from "next/navigation";

import { TenantPublicChrome } from "@/components/navigation/tenant-public-chrome";
import { TenantPublicFooter } from "@/components/navigation/tenant-public-footer";
import { TenantPublicHeader } from "@/components/navigation/tenant-public-header";
import { getTenantPublicSiteDataBySlug } from "@/lib/landing/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export default async function TenantHomeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    notFound();
  }

  const siteData = await getTenantPublicSiteDataBySlug(tenantSlug);
  const brandLabel = siteData?.branding.team_name?.trim() || tenant.name;
  const logoUrl = siteData?.branding.logo_url ?? null;

  return (
    <TenantPublicChrome
      publicHeader={<TenantPublicHeader tenantSlug={tenantSlug} brandLabel={brandLabel} logoUrl={logoUrl} />}
      publicFooter={<TenantPublicFooter tenantSlug={tenantSlug} brandLabel={brandLabel} />}
    >
      {children}
    </TenantPublicChrome>
  );
}
