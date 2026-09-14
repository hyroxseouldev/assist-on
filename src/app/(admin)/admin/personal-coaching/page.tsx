import { PersonalCoachingPage } from "@/components/admin/personal-coaching-page";
import { getCurrentAdminTenantSlug } from "@/lib/admin/current";

export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [tenantSlug, resolvedSearchParams] = await Promise.all([getCurrentAdminTenantSlug(), searchParams]);
  return <PersonalCoachingPage tenantSlug={tenantSlug} searchParams={resolvedSearchParams} />;
}
