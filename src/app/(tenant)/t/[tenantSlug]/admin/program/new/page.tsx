import Link from "next/link";

import { ChevronLeft } from "lucide-react";

import { ProgramEditorForm } from "@/components/admin/program-editor-form";
import { Button } from "@/components/ui/button";

export default async function TenantAdminProgramNewPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={`/t/${tenantSlug}/admin/program`}>
          <ChevronLeft className="size-4" />
          목록으로
        </Link>
      </Button>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">새 프로그램 등록</h1>
        <p className="mt-1 text-sm text-zinc-600">스토어와 세션 운영에 사용할 프로그램을 생성합니다.</p>
        <div className="mt-4">
          <ProgramEditorForm tenantSlug={tenantSlug} />
        </div>
      </div>
    </section>
  );
}
