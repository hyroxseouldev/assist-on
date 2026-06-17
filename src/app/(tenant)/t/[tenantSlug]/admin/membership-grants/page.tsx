import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { MembershipGrantsManager } from "@/components/admin/membership-grants-manager";
import {
  getAdminMembershipGrantUsersPage,
  getAdminProgramApplicationsPage,
  getTenantSessionPrograms,
  requireAdminUser,
} from "@/lib/admin/server";
import type { AdminMembershipGrantView } from "@/lib/admin/types";
import { canManageTenantMembers } from "@/lib/tenant/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseView(value: string | undefined): AdminMembershipGrantView {
  return value === "users" ? "users" : "applications";
}

export default async function TenantAdminMembershipGrantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase, tenantRole, isPlatformAdmin } = await requireAdminUser(tenantSlug, { allowCoach: true });
  const query = typeof resolvedSearchParams.q === "string" ? resolvedSearchParams.q : "";
  const view = parseView(typeof resolvedSearchParams.view === "string" ? resolvedSearchParams.view : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 20);
  const pageSize = [10, 20, 50].includes(pageSizeRaw) ? pageSizeRaw : 20;
  const programs = await getTenantSessionPrograms(supabase, tenantSlug);
  const canGrantMembership = isPlatformAdmin || canManageTenantMembers(tenantRole);

  const applications =
    view === "applications"
      ? await getAdminProgramApplicationsPage(supabase, tenantSlug, { query, filter: "pending", page, pageSize })
      : null;
  const users =
    view === "users"
      ? await getAdminMembershipGrantUsersPage(supabase, tenantSlug, { query, page, pageSize })
      : null;

  return (
    <AdminPageShell title="멤버쉽 부여" description="프로그램 신청 상태를 관리하고 회원에게 프로그램 멤버쉽을 부여합니다.">
      <MembershipGrantsManager
        view={view}
        applications={applications?.items ?? []}
        users={users?.items ?? []}
        total={applications?.total ?? users?.total ?? 0}
        page={applications?.page ?? users?.page ?? page}
        pageSize={applications?.pageSize ?? users?.pageSize ?? pageSize}
        totalPages={applications?.totalPages ?? users?.totalPages ?? 1}
        query={query}
        programs={programs.map((program) => ({
          id: program.id,
          label: program.label,
          deliveryMode: program.deliveryMode,
          cohorts: program.cohorts,
        }))}
        canGrantMembership={canGrantMembership}
      />
    </AdminPageShell>
  );
}
