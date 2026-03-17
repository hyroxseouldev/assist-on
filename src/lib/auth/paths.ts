export const DEFAULT_TENANT_LOGIN_SLUG = "xon-training";

export function getTenantLoginPath(tenantSlug: string) {
  return `/t/${tenantSlug}/tenant/login`;
}

export function getTenantUserLoginPath(tenantSlug: string, next?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("tenant", tenantSlug);

  if (next) {
    searchParams.set("next", next);
  }

  const query = searchParams.toString();
  return query ? `/login?${query}` : "/login";
}

export function getTenantResetPasswordPath(tenantSlug: string) {
  return `/t/${tenantSlug}/tenant/reset-password`;
}

export function getTenantUpdatePasswordPath(tenantSlug: string) {
  return `/t/${tenantSlug}/tenant/update-password`;
}
