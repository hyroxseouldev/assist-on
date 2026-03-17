export function getTenantStorePath(tenantSlug: string) {
  return `/t/${tenantSlug}/store`;
}

export function getTenantStoreProductPath(tenantSlug: string, productId: string) {
  return `${getTenantStorePath(tenantSlug)}/${productId}`;
}

export function getTenantStoreCheckoutPath(tenantSlug: string, productId: string) {
  return `${getTenantStoreProductPath(tenantSlug, productId)}/checkout`;
}

export function getTenantStoreCheckoutSuccessPath(tenantSlug: string) {
  return `${getTenantStorePath(tenantSlug)}/checkout/success`;
}

export function getTenantStoreCheckoutFailPath(tenantSlug: string) {
  return `${getTenantStorePath(tenantSlug)}/checkout/fail`;
}
