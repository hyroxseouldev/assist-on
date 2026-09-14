import { ProgramManagerForm } from "@/components/admin/program-manager-form";
import { requireAdminUser } from "@/lib/admin/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function ProgramManagersPanel({ tenantSlug, programId }: { tenantSlug: string; programId: string }) {
  const context = await requireAdminUser(tenantSlug);
  if (!context.isPlatformAdmin && context.tenantRole !== "owner") return null;
  const db = createSupabaseAdminClient();
  const [members, assignments] = await Promise.all([
    db.from("tenant_memberships").select("user_id").eq("tenant_id", context.tenant.id).eq("role", "manager"),
    db.from("program_managers").select("manager_user_id").eq("tenant_id", context.tenant.id).eq("program_id", programId),
  ]);
  if (members.error || assignments.error) throw new Error("담당 매니저 정보를 불러오지 못했습니다.");
  const ids: string[] = (members.data ?? []).map((member: { user_id: string }) => member.user_id);
  const [profiles, tenantProfiles] = ids.length ? await Promise.all([
    db.from("profiles").select("id, full_name").in("id", ids),
    db.from("tenant_user_profiles").select("user_id, display_name").eq("tenant_id", context.tenant.id).in("user_id", ids),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (profiles.error || tenantProfiles.error) throw new Error("매니저 이름을 불러오지 못했습니다.");
  const assignedIds: string[] = (assignments.data ?? []).map((row: { manager_user_id: string }) => row.manager_user_id);
  const managers = ids.map((id) => ({
    id,
    name: tenantProfiles.data?.find((p) => p.user_id === id)?.display_name?.trim()
      || profiles.data?.find((p) => p.id === id)?.full_name?.trim() || "이름 없는 매니저",
  })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return <ProgramManagerForm key={`${programId}:${assignedIds.join(",")}`} tenantSlug={tenantSlug} programId={programId} managers={managers} assignedIds={assignedIds} />;
}
