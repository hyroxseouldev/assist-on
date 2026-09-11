import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { ProgramChangesPage, type ProgramChangesSearchParams } from "@/components/admin/program-changes-page";

export default async function Page({ searchParams }: { searchParams: Promise<ProgramChangesSearchParams> }) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  return <ProgramChangesPage tenantSlug={tenantSlug} searchParams={await searchParams} />;
}
