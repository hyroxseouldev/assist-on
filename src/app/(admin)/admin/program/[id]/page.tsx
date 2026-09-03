import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { ProgramEditorForm } from "@/components/admin/program-editor-form";
import { Button } from "@/components/ui/button";
import { getAdminProgramById, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, tenantSlug] = await Promise.all([params, getCurrentAdminTenantSlug()]);
  const { supabase, tenant, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug);
  const program = await getAdminProgramById(supabase, tenant.id, id);
  const canManageCoachAssignments = isPlatformAdmin || tenantRole === "owner";

  if (!program) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/program`}>
          <ChevronLeft className="size-4" />
          목록으로
        </Link>
      </Button>

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">프로그램 수정</h1>
        <p className="mt-1 text-sm text-zinc-600">프로그램 기본 정보를 수정합니다.</p>
        <div className="mt-4">
          <ProgramEditorForm tenantSlug={tenantSlug} program={program} canManageCoachAssignments={canManageCoachAssignments} />
        </div>
      </div>
    </section>
  );
}
