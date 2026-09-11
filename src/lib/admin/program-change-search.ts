import "server-only";

import { requireAdminUser } from "@/lib/admin/server";
import type { ManagedUsersPage } from "@/lib/admin/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type ProgramChangeSearchOptions = {
  query: string;
  programId: string | null;
  activeOnly: boolean;
  page: number;
};

export async function getProgramChangeUsersPage(
  tenantSlug: string,
  options: ProgramChangeSearchOptions
): Promise<ManagedUsersPage & { nowTimestamp: number }> {
  const { tenant, user } = await requireAdminUser(tenantSlug, { allowManager: true });
  const { data, error } = await createSupabaseAdminClient().rpc("search_program_change_members", {
    p_tenant_id: tenant.id,
    p_actor_id: user.id,
    p_query: options.query,
    p_program_id: options.programId,
    p_active_only: options.activeOnly,
    p_page: options.page,
    p_page_size: 10,
  });

  if (error || !data) {
    console.error("Failed to search program change members", { tenantId: tenant.id, error });
    throw new Error("회원 검색 결과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  return data;
}
