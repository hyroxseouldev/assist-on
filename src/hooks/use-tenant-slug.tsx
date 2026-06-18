"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, type ReactNode } from "react";

const TenantSlugContext = createContext<string | null>(null);

export function TenantSlugProvider({
  children,
  tenantSlug,
}: {
  children: ReactNode;
  tenantSlug: string;
}) {
  return <TenantSlugContext.Provider value={tenantSlug}>{children}</TenantSlugContext.Provider>;
}

export function useTenantSlug() {
  const contextTenantSlug = useContext(TenantSlugContext);
  const pathname = usePathname();

  if (contextTenantSlug) {
    return contextTenantSlug;
  }

  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  return tenantSlugMatch?.[1] ?? null;
}
