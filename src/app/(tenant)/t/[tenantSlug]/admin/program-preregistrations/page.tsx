import { ProgramPreregistrationsPage } from "@/components/admin/program-preregistrations-page";

export default async function Page({ params, searchParams }: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { tenantSlug } = await params;
  const { programId } = await searchParams;
  return <ProgramPreregistrationsPage tenantSlug={tenantSlug} programId={typeof programId === "string" ? programId : undefined} />;
}
