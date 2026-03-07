import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { WorkoutRecordsLeaderboard } from "@/components/admin/workout-records-leaderboard";
import { getAdminWorkoutLeaderboardPage, requireAdminUser } from "@/lib/admin/server";

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export default async function TenantAdminWorkoutRecordsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const params = await searchParams;
  const { supabase } = await requireAdminUser();

  const exerciseKey = typeof params.exerciseKey === "string" ? params.exerciseKey : undefined;
  const presetKey = typeof params.presetKey === "string" ? params.presetKey : undefined;
  const page = parsePositiveInt(typeof params.page === "string" ? params.page : undefined, 1);
  const pageSizeRaw = parsePositiveInt(typeof params.pageSize === "string" ? params.pageSize : undefined, 100);
  const pageSize = [20, 50, 100].includes(pageSizeRaw) ? pageSizeRaw : 100;

  const result = await getAdminWorkoutLeaderboardPage(supabase, {
    exerciseKey,
    presetKey,
    page,
    pageSize,
  });

  return (
    <AdminPageShell
      title="운동 레코드 리더보드"
      description="운동 종목과 프리셋 기준으로 회원 개인 최고 기록을 순위로 조회합니다."
    >
      <WorkoutRecordsLeaderboard
        exerciseOptions={result.exerciseOptions}
        presetOptions={result.presetOptions}
        selectedExerciseKey={result.selectedExerciseKey}
        selectedPresetKey={result.selectedPresetKey}
        items={result.items}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
      />
    </AdminPageShell>
  );
}
