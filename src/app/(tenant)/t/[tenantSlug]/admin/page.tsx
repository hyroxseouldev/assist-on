import { AdminDashboard } from "@/components/admin/admin-dashboard";
import {
  getAdminHomeOverview,
  getAdminActiveProgramMissionParticipationStats,
  getAdminProgramFeedbackAchievementStats,
  getAdminProgramMemberChartStats,
  getAdminProgramApplicationsPage,
  getAdminRecentProgramSessionReviews,
  getAdminRecentSignupStats,
  getManagedProgramIdsForUser,
  requireAdminUser,
} from "@/lib/admin/server";

export default async function TenantAdminHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, tenant, user, isPlatformAdmin, tenantRole } =
    await requireAdminUser(tenantSlug, { allowCoach: true });
  const isScopedToManagedPrograms = !isPlatformAdmin && tenantRole !== "owner";
  const managedProgramIds = isScopedToManagedPrograms
    ? await getManagedProgramIdsForUser(supabase, tenant.id, user.id)
    : [];
  const dashboardContext = {
    tenantId: tenant.id,
    user,
    isPlatformAdmin,
    tenantRole,
    managedProgramIds,
  };
  const [
    overview,
    pendingApplications,
    recentSignupStats,
    programMemberStats,
    missionParticipationStats,
    feedbackAchievementStats,
    recentFeedback,
    recentPendingFeedback,
  ] = await Promise.all([
    getAdminHomeOverview(supabase, dashboardContext),
    getAdminProgramApplicationsPage(supabase, tenantSlug, {
      query: "",
      filter: "pending",
      page: 1,
      pageSize: 10,
    }),
    getAdminRecentSignupStats(supabase, tenant.id),
    getAdminProgramMemberChartStats(supabase, tenant.id),
    getAdminActiveProgramMissionParticipationStats(supabase, dashboardContext),
    getAdminProgramFeedbackAchievementStats(supabase, dashboardContext),
    getAdminRecentProgramSessionReviews(supabase, dashboardContext, {
      recentDays: 7,
    }),
    getAdminRecentProgramSessionReviews(supabase, dashboardContext, {
      status: "submitted",
      limit: 3,
      recentDays: 7,
    }),
  ]);
  const recentFeedbackPreview = [
    ...recentPendingFeedback,
    ...recentFeedback.filter(
      (review) =>
        !recentPendingFeedback.some((pending) => pending.id === review.id),
    ),
  ].slice(0, 3);

  return (
    <AdminDashboard
      basePath={`/t/${tenantSlug}/admin`}
      overview={overview}
      pendingApplications={pendingApplications}
      recentSignupStats={recentSignupStats}
      programMemberStats={programMemberStats}
      missionParticipationStats={missionParticipationStats}
      feedbackAchievementStats={feedbackAchievementStats}
      recentFeedback={recentFeedbackPreview}
    />
  );
}
