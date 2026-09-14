import { PersonalCoachingEditorPage } from "@/components/admin/personal-coaching-editor-page";
import { getCurrentAdminTenantSlug } from "@/lib/admin/current";

export default async function Page() {
  const tenantSlug = await getCurrentAdminTenantSlug();
  return <PersonalCoachingEditorPage tenantSlug={tenantSlug} />;
}
