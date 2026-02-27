import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantBySlug } from "@/lib/tenant/server";

export default async function TenantHomeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const supabase = await createSupabaseServerClient();

  const tenant = await getTenantBySlug(supabase, tenantSlug);
  if (!tenant) {
    notFound();
  }

  return <>{children}</>;
}
