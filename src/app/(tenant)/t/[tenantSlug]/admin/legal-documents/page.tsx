import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LegalDocumentsList } from "@/components/admin/legal-documents-list";
import { getAdminLegalDocuments, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminLegalDocumentsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase } = await requireAdminUser();
  const documents = await getAdminLegalDocuments(supabase);

  return (
    <AdminPageShell
      title="리걸 도큐먼트"
      description="legal_documents 테이블의 게시 문서와 공개 URL을 조회합니다."
    >
      <LegalDocumentsList tenantSlug={tenantSlug} documents={documents} />
    </AdminPageShell>
  );
}
