import { getCurrentAdminTenantSlug } from "@/lib/admin/current";
import Link from "next/link";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { SessionsCalendarManager } from "@/components/admin/sessions-calendar-manager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessions, getTenantSessionPrograms, requireAdminUser } from "@/lib/admin/server";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function TenantAdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ programId?: string }>;
}) {
  const tenantSlug = await getCurrentAdminTenantSlug();
  const { programId: programIdParam } = await searchParams;
  const { supabase, user, isPlatformAdmin, tenantRole } = await requireAdminUser(tenantSlug, { allowCoach: true });
  const programs = await getTenantSessionPrograms(supabase, tenantSlug, {
    userId: user.id,
    isPlatformAdmin,
    tenantRole,
  });
  const selectedProgramId =
    programIdParam && programs.some((program) => program.id === programIdParam) ? programIdParam : programs[0]?.id;
  const canCreateProgram = isPlatformAdmin || tenantRole === "owner";

  if (!selectedProgramId) {
    return (
      <AdminPageShell title="운동 입력" description="날짜를 선택해 세션을 생성, 수정, 삭제합니다.">
        <Card>
          <CardHeader>
            <CardTitle>등록된 프로그램이 없습니다</CardTitle>
            <CardDescription>세션을 등록하려면 먼저 프로그램을 생성해 주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-zinc-600">
            <p>
              {canCreateProgram
                ? "프로그램 관리에서 새 프로그램을 등록한 뒤 다시 이용해 주세요."
                : "프로그램 등록 권한이 있는 관리자에게 프로그램 생성을 요청해 주세요."}
            </p>
            {canCreateProgram ? (
              <Button asChild>
                <Link href={`/admin/program/new`}>새 프로그램 등록</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </AdminPageShell>
    );
  }

  const sessions = await getSessions(supabase, tenantSlug, selectedProgramId, {
    userId: user.id,
    isPlatformAdmin,
    tenantRole,
  });
  const now = new Date();

  return (
    <AdminPageShell title="운동 입력" description="날짜를 선택해 세션을 생성, 수정, 삭제합니다.">
      <SessionsCalendarManager
        programId={selectedProgramId}
        sessions={sessions}
        programs={programs}
        initialDateKey={toDateKey(now)}
        nowTimestamp={now.getTime()}
      />
    </AdminPageShell>
  );
}
