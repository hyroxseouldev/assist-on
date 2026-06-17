export const DEFAULT_TENANT_LOGIN_SLUG = "xon-training";

export function getTenantLoginPath(tenantSlug: string) {
  return `/t/${tenantSlug}/tenant/login`;
}

export function getTenantResetPasswordPath(tenantSlug: string) {
  return `/t/${tenantSlug}/tenant/reset-password`;
}

export function getTenantUpdatePasswordPath(tenantSlug: string) {
  return `/t/${tenantSlug}/tenant/update-password`;
}
