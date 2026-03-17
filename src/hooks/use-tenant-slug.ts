"use client";

import { usePathname } from "next/navigation";

export function useTenantSlug() {
  const pathname = usePathname();
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  return tenantSlugMatch?.[1] ?? null;
}
