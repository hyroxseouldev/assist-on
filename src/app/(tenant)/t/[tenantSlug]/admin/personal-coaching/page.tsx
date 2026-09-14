import { PersonalCoachingPage } from "@/components/admin/personal-coaching-page";

export default async function Page({ params, searchParams }: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tenantSlug }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  return <PersonalCoachingPage tenantSlug={tenantSlug} searchParams={resolvedSearchParams} />;
}
