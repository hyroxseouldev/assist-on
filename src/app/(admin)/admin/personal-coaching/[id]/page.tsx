import { PersonalCoachingEditorPage } from "@/components/admin/personal-coaching-editor-page";
import { getCurrentAdminTenantSlug } from "@/lib/admin/current";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, tenantSlug] = await Promise.all([params, getCurrentAdminTenantSlug()]);
  return <PersonalCoachingEditorPage tenantSlug={tenantSlug} id={id} />;
}
