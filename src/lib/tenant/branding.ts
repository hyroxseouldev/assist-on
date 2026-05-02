const DEFAULT_TENANT_BRAND_NAME = "Assist On";
const DEFAULT_TENANT_LOGO_URL = "/logo.png";

export function resolveTenantBrandName(tenantName?: string | null) {
  return tenantName?.trim() || DEFAULT_TENANT_BRAND_NAME;
}

export function resolveTenantBrandLogoUrl(logoUrl?: string | null) {
  return logoUrl?.trim() || DEFAULT_TENANT_LOGO_URL;
}
