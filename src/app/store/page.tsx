import { redirect } from "next/navigation";

import { getCurrentTenantSlug } from "@/lib/tenant/server";

export default async function StoreDirectoryPage() {
  const tenantSlug = await getCurrentTenantSlug();
  redirect(`/store/${tenantSlug}`);
}
