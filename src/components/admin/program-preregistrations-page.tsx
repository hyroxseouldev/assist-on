import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramPreregistrationsManager } from "@/components/admin/program-preregistrations-manager";
import { requireAdminUser } from "@/lib/admin/server";
import type { PreregistrationRow } from "@/lib/admin/preregistration";

export async function ProgramPreregistrationsPage({ tenantSlug, programId }: { tenantSlug: string; programId?: string }) {
  const { supabase, tenant } = await requireAdminUser(tenantSlug);
  const { data, error } = await supabase.from("programs").select("id, title, delivery_mode")
    .eq("tenant_id", tenant.id).order("created_at", { ascending: false });
  if (error) throw new Error("프로그램 목록을 불러오지 못했습니다.");
  const programs = data ?? [];
  const selectedProgramId = programs.find((program) => program.id === programId)?.id ?? programs[0]?.id ?? "";
  const rows: PreregistrationRow[] = [];
  if (selectedProgramId) {
    for (let offset = 0; ; offset += 500) {
      const { data: batch, error: listError } = await supabase.from("entitlement_auto_grants")
        .select("id, full_name, phone_number, starts_at, ends_at, expires_at, is_active, matched_at")
        .eq("tenant_id", tenant.id).eq("program_id", selectedProgramId)
        .order("created_at", { ascending: false }).order("id")
        .range(offset, offset + 499).returns<PreregistrationRow[]>();
      if (listError) throw new Error("사전등록 명단을 불러오지 못했습니다.");
      rows.push(...(batch ?? []));
      if (!batch || batch.length < 500) break;
    }
  }
  const now = new Date();
  return (
    <AdminPageShell title="프로그램 사전등록" description="프로그램 시작 전에 참여자 명단을 등록하고 가입 시 이용권을 자동으로 부여합니다.">
      <ProgramPreregistrationsManager key={selectedProgramId} programs={programs} selectedProgramId={selectedProgramId} rows={rows} now={now.getTime()} />
    </AdminPageShell>
  );
}
