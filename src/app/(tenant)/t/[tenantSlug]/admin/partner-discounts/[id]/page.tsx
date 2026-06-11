import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { PartnerDiscountCodeEditorForm } from "@/components/admin/partner-discount-code-editor-form";
import { Button } from "@/components/ui/button";
import { getAdminPartnerDiscountCodeEditorData, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminPartnerDiscountDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const { supabase } = await requireAdminUser(tenantSlug);
  const { code, programs } = await getAdminPartnerDiscountCodeEditorData(supabase, tenantSlug, id);

  if (!code) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={`/t/${tenantSlug}/admin/partner-discounts`}>
          <ChevronLeft className="size-4" />
          목록으로
        </Link>
      </Button>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">제휴 할인 코드 수정</h1>
        <p className="mt-1 text-sm text-zinc-600">브랜드, 노출 대상, 모바일 공개 상태와 사용 정보를 수정합니다.</p>
        <div className="mt-4">
          <PartnerDiscountCodeEditorForm tenantSlug={tenantSlug} code={code} programs={programs} />
        </div>
      </div>
    </section>
  );
}
