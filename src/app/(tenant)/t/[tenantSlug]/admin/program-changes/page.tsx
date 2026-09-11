import { ProgramChangesPage, type ProgramChangesSearchParams } from "@/components/admin/program-changes-page";

export default async function Page({ params, searchParams }: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<ProgramChangesSearchParams>;
}) {
  const { tenantSlug } = await params;
  return <ProgramChangesPage tenantSlug={tenantSlug} searchParams={await searchParams} />;
}
