export function getTenantBookingPath(tenantSlug: string) {
  return `/t/${tenantSlug}/booking`;
}

export function getTenantBookingServicePath(tenantSlug: string, serviceId: string) {
  return `${getTenantBookingPath(tenantSlug)}/${serviceId}`;
}

export function getTenantBookingCheckoutPath(tenantSlug: string, serviceId: string) {
  return `${getTenantBookingServicePath(tenantSlug, serviceId)}/checkout`;
}

export function getTenantBookingCheckoutSuccessPath(tenantSlug: string) {
  return `${getTenantBookingPath(tenantSlug)}/checkout/success`;
}

export function getTenantBookingCheckoutFailPath(tenantSlug: string) {
  return `${getTenantBookingPath(tenantSlug)}/checkout/fail`;
}
