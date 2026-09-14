import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ProgramManagerContext = {
  tenant: { id: string };
  user: { id: string };
  isPlatformAdmin: boolean;
  tenantRole: string | null;
};

/** null means unrestricted owner access; [] means no assigned programs. */
export async function getManagerProgramScope(context: ProgramManagerContext): Promise<string[] | null> {
  if (context.isPlatformAdmin || context.tenantRole === "owner") return null;
  if (context.tenantRole !== "manager") return [];
  const { data, error } = await createSupabaseAdminClient().from("program_managers")
    .select("program_id").eq("tenant_id", context.tenant.id).eq("manager_user_id", context.user.id);
  if (error) throw new Error("담당 프로그램을 불러오지 못했습니다.");
  return (data ?? []).map((row: { program_id: string }) => row.program_id);
}

export function filterAssignedPrograms<T extends { id: string }>(programs: T[], scope: string[] | null): T[] {
  if (scope === null) return programs;
  const ids = new Set(scope);
  return programs.filter((program) => ids.has(program.id));
}
