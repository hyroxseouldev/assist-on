import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { ProgramProductEditorForm } from "@/components/admin/program-product-editor-form";
import { Button } from "@/components/ui/button";
import { getAdminProgramProductById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminStoreProductDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const { supabase } = await requireAdminUser();
  const product = await getAdminProgramProductById(supabase, id);

  if (!product) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={`/t/${tenantSlug}/admin/store/products`}>
          <ChevronLeft className="size-4" />
          목록으로
        </Link>
      </Button>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">스토어 상품 수정</h1>
        <p className="mt-1 text-sm text-zinc-600">가격과 판매 상태를 관리하고 공개 링크를 복사할 수 있습니다.</p>
        <div className="mt-4">
          <ProgramProductEditorForm tenantSlug={tenantSlug} product={product} />
        </div>
      </div>
    </section>
  );
}
