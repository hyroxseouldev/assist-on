import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { ProgramEditorForm } from "@/components/admin/program-editor-form";
import { ProgramManagersPanel } from "@/components/admin/program-managers-panel";
import { Button } from "@/components/ui/button";
import { getAdminProgramById, requireAdminUser } from "@/lib/admin/server";
import { personalCoachingThumbnail } from "@/lib/admin/personal-coaching";
import { isPersonalHyroxProgram } from "@/lib/billing/model";

export async function PersonalCoachingEditorPage({ tenantSlug, id }: { tenantSlug: string; id?: string }) {
  const { supabase, tenant, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug);
  const program = id ? await getAdminProgramById(supabase, tenant.id, id) : undefined;
  if (id && (!program || !isPersonalHyroxProgram(program.title))) notFound();
  const canManageCoachAssignments = isPlatformAdmin || tenantRole === "owner";
  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/personal-coaching"><ChevronLeft className="size-4" />목록으로</Link>
      </Button>
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h1 className="text-lg font-semibold">{program ? "개인 코칭 프로그램 수정" : "개인 코칭 프로그램 등록"}</h1>
        <p className="mt-1 text-sm text-zinc-600">프로그램명·구매 멤버 공개·고정 날짜·대표 이미지를 개인 코칭 기준으로 고정합니다.</p>
        {!program ? <p className="mt-1 text-sm text-zinc-600">회원 이름과 기간을 입력해 생성한 뒤 담당 코치를 지정할 수 있습니다.</p> : null}
        <div className="mt-4">
          {personalCoachingThumbnail(tenantSlug) ? (
            <ProgramEditorForm tenantSlug={tenantSlug} program={program ?? undefined} personalCoaching canManageCoachAssignments={canManageCoachAssignments} />
          ) : <p role="alert" className="text-sm text-zinc-600">이 고객사의 개인 코칭 공통 이미지가 아직 설정되지 않았습니다.</p>}
        </div>
      </div>
      {id && canManageCoachAssignments ? <ProgramManagersPanel tenantSlug={tenantSlug} programId={id} /> : null}
    </section>
  );
}
