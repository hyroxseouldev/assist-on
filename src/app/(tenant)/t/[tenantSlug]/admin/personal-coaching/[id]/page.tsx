import { PersonalCoachingEditorPage } from "@/components/admin/personal-coaching-editor-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string; id: string }> }) {
  const { tenantSlug, id } = await params;
  return <PersonalCoachingEditorPage tenantSlug={tenantSlug} id={id} />;
}
