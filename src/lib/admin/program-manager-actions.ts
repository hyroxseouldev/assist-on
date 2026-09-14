"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdminUser } from "@/lib/admin/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const assignmentSchema = z.object({
  programId: z.uuid(),
  managerIds: z.array(z.uuid()).max(100),
});

export async function saveProgramManagers(tenantSlug: string, input: unknown) {
  try {
    const context = await requireAdminUser(tenantSlug);
    if (!context.isPlatformAdmin && context.tenantRole !== "owner") {
      return { ok: false, message: "담당 매니저 지정은 오너만 변경할 수 있습니다." };
    }
    const parsed = assignmentSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "프로그램과 매니저를 확인해 주세요." };
    const { error } = await createSupabaseAdminClient().rpc("set_program_managers", {
      p_tenant_id: context.tenant.id,
      p_program_id: parsed.data.programId,
      p_actor_id: context.user.id,
      p_manager_ids: [...new Set(parsed.data.managerIds)],
    });
    if (error) {
      console.error("Failed to assign program managers", { code: error.code });
      return { ok: false, message: "매니저 배정을 저장하지 못했습니다. 계정 역할과 프로그램을 확인해 주세요." };
    }
    revalidatePath("/admin", "layout");
    revalidatePath(`/t/${tenantSlug}/admin`, "layout");
    return { ok: true, message: "담당 매니저를 저장했습니다." };
  } catch {
    return { ok: false, message: "매니저 배정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
}
