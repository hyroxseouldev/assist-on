import type { ReactNode } from "react";

import { PublicLegalFooter } from "@/components/navigation/public-legal-footer";
import { PublicHeader } from "@/components/navigation/public-header";

export default async function PublicStoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <>
      <PublicHeader />
      {children}
      <div className="mx-auto mt-10 w-full max-w-5xl px-4 pb-10 sm:px-6">
        <PublicLegalFooter tenantSlug={tenantSlug} />
      </div>
    </>
  );
}
