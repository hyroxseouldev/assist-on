export function getMarketingTenantId() {
  const value = process.env.MARKETING_TENANT_ID;
  if (!value) {
    return null;
  }

  const tenantId = value.trim();
  return tenantId.length > 0 ? tenantId : null;
}
