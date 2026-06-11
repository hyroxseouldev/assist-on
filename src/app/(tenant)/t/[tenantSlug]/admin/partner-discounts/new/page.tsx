import Link from "next/link";

import { ChevronLeft } from "lucide-react";

import { PartnerDiscountCodeEditorForm } from "@/components/admin/partner-discount-code-editor-form";
import { Button } from "@/components/ui/button";
import { getAdminPartnerDiscountCodeEditorData, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminPartnerDiscountNewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase } = await requireAdminUser(tenantSlug);
  const { programs } = await getAdminPartnerDiscountCodeEditorData(supabase, tenantSlug);

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={`/t/${tenantSlug}/admin/partner-discounts`}>
          <ChevronLeft className="size-4" />
          목록으로
        </Link>
      </Button>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">제휴 할인 코드 생성</h1>
        <p className="mt-1 text-sm text-zinc-600">회원에게 노출할 외부 제휴 혜택과 코드 정보를 등록합니다.</p>
        <div className="mt-4">
          <PartnerDiscountCodeEditorForm tenantSlug={tenantSlug} programs={programs} />
        </div>
      </div>
    </section>
  );
}
