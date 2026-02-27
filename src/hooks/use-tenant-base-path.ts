"use client";

import { usePathname } from "next/navigation";

export function useTenantBasePath() {
  const pathname = usePathname();
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  return tenantSlugMatch ? `/t/${tenantSlugMatch[1]}` : "";
}
