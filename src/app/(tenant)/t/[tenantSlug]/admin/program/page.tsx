import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramsList } from "@/components/admin/programs-list";
import { getAdminPrograms, requireAdminUser } from "@/lib/admin/server";

export default async function TenantAdminProgramPage() {
  const { supabase } = await requireAdminUser();
  const programs = await getAdminPrograms(supabase);

  return (
    <AdminPageShell title="프로그램 관리" description="프로그램을 생성하고 기간/설명을 관리합니다.">
      <ProgramsList programs={programs} />
    </AdminPageShell>
  );
}
