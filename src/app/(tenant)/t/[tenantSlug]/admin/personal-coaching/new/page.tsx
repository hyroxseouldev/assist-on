import { PersonalCoachingEditorPage } from "@/components/admin/personal-coaching-editor-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PersonalCoachingEditorPage tenantSlug={tenantSlug} />;
}
