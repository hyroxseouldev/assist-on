const TENANT_ROUTE_PATTERN = /^\/t\/([^/]+)(?:\/|$)/;

function getSingleSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : undefined;
}

function isSafeInternalPath(value: string | undefined) {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export function extractTenantSlugFromPath(path: string | undefined) {
  if (typeof path !== "string" || !isSafeInternalPath(path)) {
    return undefined;
  }

  const tenantMatch = path.match(TENANT_ROUTE_PATTERN);
  if (tenantMatch?.[1]) {
    return tenantMatch[1];
  }

  return undefined;
}

export function resolveAuthBrandingTenantSlug(searchParams: Record<string, string | string[] | undefined>) {
  const explicitTenantSlug = getSingleSearchParam(searchParams.tenant);
  if (explicitTenantSlug) {
    return explicitTenantSlug;
  }

  const nextPath = getSingleSearchParam(searchParams.next);
  return extractTenantSlugFromPath(nextPath);
}
