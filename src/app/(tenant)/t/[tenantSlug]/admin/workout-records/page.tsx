import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { WorkoutRecordsLeaderboard } from "@/components/admin/workout-records-leaderboard";
import { getAdminWorkoutLeaderboardPage, requireAdminUser } from "@/lib/admin/server";
import { isProfileGender, type ProfileGender } from "@/lib/profile/gender";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseGender(value: string | undefined): ProfileGender | "all" {
  if (!value || value === "all") {
    return "all";
  }

  return isProfileGender(value) ? value : "all";
}

export default async function TenantAdminWorkoutRecordsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { tenantSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const { supabase } = await requireAdminUser(tenantSlug, { allowCoach: true });

  const exerciseKey = typeof resolvedSearchParams.exerciseKey === "string" ? resolvedSearchParams.exerciseKey : undefined;
  const presetKey = typeof resolvedSearchParams.presetKey === "string" ? resolvedSearchParams.presetKey : undefined;
  const gender = parseGender(typeof resolvedSearchParams.gender === "string" ? resolvedSearchParams.gender : undefined);
  const page = parsePositiveInt(typeof resolvedSearchParams.page === "string" ? resolvedSearchParams.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof resolvedSearchParams.pageSize === "string" ? resolvedSearchParams.pageSize : undefined, 100);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 100;

  const result = await getAdminWorkoutLeaderboardPage(supabase, tenantSlug, {
    exerciseKey,
    presetKey,
    gender,
    page,
    pageSize,
  });

  return (
    <AdminPageShell
      title="리더보드"
      description="운동 종목과 프리셋 기준으로 회원 개인 최고 기록을 순위로 조회합니다."
    >
      <WorkoutRecordsLeaderboard
        exerciseOptions={result.exerciseOptions}
        presetOptions={result.presetOptions}
        selectedExerciseKey={result.selectedExerciseKey}
        selectedPresetKey={result.selectedPresetKey}
        selectedGender={result.selectedGender}
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </AdminPageShell>
  );
}
