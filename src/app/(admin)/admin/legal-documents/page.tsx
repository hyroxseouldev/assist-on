import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { LegalDocumentsList } from "@/components/admin/legal-documents-list";
import { getAdminLegalDocumentsPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminLegalDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const documents = await getAdminLegalDocumentsPage(supabase, tenantSlug, { page, pageSize });

  return (
    <AdminPageShell
      title="약관"
      description="legal_documents 테이블의 게시 문서와 공개 URL을 조회합니다."
    >
      <LegalDocumentsList
        tenantSlug={tenantSlug}
        documents={documents.items}
        total={documents.total}
        page={documents.page}
        pageSize={documents.pageSize}
        totalPages={documents.totalPages}
      />
    </AdminPageShell>
  );
}
