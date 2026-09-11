import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { ProgramPreregistrationsPage } from "@/components/admin/program-preregistrations-page";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const { programId } = await searchParams;
  return <ProgramPreregistrationsPage tenantSlug={tenantSlug} programId={typeof programId === "string" ? programId : undefined} />;
}
