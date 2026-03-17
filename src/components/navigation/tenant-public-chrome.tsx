"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

type TenantPublicChromeProps = {
  publicHeader: ReactNode;
  publicFooter: ReactNode;
  children: ReactNode;
};

export function TenantPublicChrome({ publicHeader, publicFooter, children }: TenantPublicChromeProps) {
  const pathname = usePathname();
  const isAdminPage = pathname.includes("/admin");

  if (isAdminPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {publicHeader}
      {children}
      {publicFooter}
    </div>
  );
}
