import { cache, Suspense, type ReactNode } from "react";

import { AdminDashboard, DashboardFeedback, DashboardMetrics, DashboardPrograms, DashboardSignups } from "@/components/admin/admin-dashboard";
import { DashboardSectionError } from "@/components/admin/dashboard-section-error";
import { ProgramMemberChart } from "@/components/admin/program-member-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getAdminHomeOverview, getAdminActiveProgramMissionParticipationStats,
  getAdminProgramFeedbackAchievementStats, getAdminProgramMemberChartStats,
  getAdminRecentProgramSessionReviews, getAdminRecentSignupStats,
  getManagedProgramIdsForUser, requireAdminUser,
} from "@/lib/admin/server";

async function SectionContent({ title, load }: { title: string; load: () => Promise<ReactNode> }) {
  try {
    return await load();
  } catch {
    console.error("[admin.dashboard]", { section: title });
    return <DashboardSectionError title={title} />;
  }
}

function Section({ title, load }: { title: string; load: () => Promise<ReactNode> }) {
  return <Suspense fallback={<div role="status" aria-label={`${title} 불러오는 중`}><Skeleton className="h-48 w-full rounded-xl" /></div>}>
    <SectionContent title={title} load={load} />
  </Suspense>;
}

export async function DashboardPage({ tenantSlug, basePath }: { tenantSlug: string; basePath: string }) {
  const { supabase: session, tenant, user, profile, isPlatformAdmin, tenantRole } =
    await requireAdminUser(tenantSlug, { allowCoach: true, allowManager: true });
  const readOnly = tenantRole === "manager" && !isPlatformAdmin;
  const supabase = readOnly ? createSupabaseAdminClient() : session;
  const scoped = !isPlatformAdmin && tenantRole !== "owner" && tenantRole !== "manager";
  const managedProgramIds = scoped ? await getManagedProgramIdsForUser(session, tenant.id, user.id) : [];
  const context = { tenantId: tenant.id, user, isPlatformAdmin, tenantRole, managedProgramIds };
  const links = { basePath, readOnly };
  // Share promises only within this render; never cache tenant data across sessions.
  const mission = cache(() => getAdminActiveProgramMissionParticipationStats(session, context));
  const signups = cache(() => getAdminRecentSignupStats(supabase, tenant.id, user.id));

  return <AdminDashboard {...links} displayName={profile?.full_name?.trim() || user.email || "관리자"}
    feedback={<Section title="오늘 처리할 업무" load={async () => {
      const [overview, recent, pending] = await Promise.all([
        getAdminHomeOverview(supabase, context),
        getAdminRecentProgramSessionReviews(supabase, context, { recentDays: 7, limit: 3 }),
        getAdminRecentProgramSessionReviews(supabase, context, { recentDays: 7, status: "submitted", limit: 3 }),
      ]);
      const ids = new Set(pending.map((row) => row.id));
      return <DashboardFeedback {...links} pendingCount={overview.pendingSessionReviewCount}
        recentFeedback={[...pending, ...recent.filter((row) => !ids.has(row.id))].slice(0, 3)} />;
    }} />}>
    <Section title="핵심 운영 지표" load={async () => {
      const [missionParticipationStats, recentSignupStats] = await Promise.all([mission(), signups()]);
      return <DashboardMetrics {...{ missionParticipationStats, recentSignupStats }} />;
    }} />
    <Section title="프로그램 현황" load={async () => {
      const [missionParticipationStats, feedbackAchievementStats] = await Promise.all([
        mission(), getAdminProgramFeedbackAchievementStats(supabase, context),
      ]);
      return <DashboardPrograms {...links} {...{ missionParticipationStats, feedbackAchievementStats }} />;
    }} />
    <Section title="프로그램 회원 통계" load={async () => <ProgramMemberChart
      stats={await getAdminProgramMemberChartStats(supabase, tenant.id)} className="rounded-xl border-line/80" />} />
    <Section title="최근 가입 회원" load={async () => <DashboardSignups recentSignupStats={await signups()} />} />
  </AdminDashboard>;
}
