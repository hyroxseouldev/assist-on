import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AdminProgramMissionParticipationStats } from "@/lib/admin/types";

type ProgramMissionParticipationCardProps = {
  stats: AdminProgramMissionParticipationStats;
  className?: string;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function calculateRate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

export function ProgramMissionParticipationCard({ stats, className }: ProgramMissionParticipationCardProps) {
  const sortedPrograms = [...stats.programs].sort((a, b) => {
    const aHasTargets = a.expected_count > 0;
    const bHasTargets = b.expected_count > 0;

    if (aHasTargets !== bHasTargets) {
      return aHasTargets ? -1 : 1;
    }

    return b.participation_rate - a.participation_rate;
  });
  const totalExpectedCount = stats.programs.reduce((sum, program) => sum + program.expected_count, 0);
  const totalParticipatedCount = stats.programs.reduce((sum, program) => sum + program.participated_count, 0);
  const totalParticipationRate = calculateRate(totalParticipatedCount, totalExpectedCount);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 px-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-lg font-semibold text-zinc-950">활성 프로그램 미션 참여율</CardTitle>
          <p className="text-sm text-zinc-500">오늘까지 참여 가능한 미션을 회원이 수행한 비율입니다.</p>
        </div>
        {totalExpectedCount > 0 ? (
          <div className="shrink-0 text-left sm:text-right">
            <p className="text-xs text-zinc-500">전체 참여율</p>
            <p className="text-xl font-semibold tabular-nums text-emerald-600">{totalParticipationRate}%</p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="px-5">
        {sortedPrograms.length > 0 ? (
          <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
            {sortedPrograms.map((program) => {
              const hasTargets = program.expected_count > 0;

              return (
                <div key={program.program_id} className="min-w-0 space-y-2.5">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950">{program.program_title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        참여 {formatCount(program.participated_count)}/{formatCount(program.expected_count)}회
                        <span className="px-1 text-zinc-300">·</span>
                        회원 {formatCount(program.active_member_count)}명
                        <span className="px-1 text-zinc-300">·</span>
                        미션 {formatCount(program.mission_count)}개
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-zinc-950">
                      {hasTargets ? `${program.participation_rate}%` : "-"}
                    </p>
                  </div>
                  <Progress
                    value={hasTargets ? program.participation_rate : 0}
                    aria-label={`${program.program_title} 미션 참여율`}
                    className="[&_[data-slot=progress-indicator]]:bg-emerald-500"
                  />
                  {!hasTargets ? <p className="text-xs text-zinc-500">현재 참여 대상인 미션이 없습니다.</p> : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center">
            <p className="text-sm font-medium text-zinc-900">현재 활성화 중인 프로그램이 없습니다.</p>
            <p className="mt-2 text-sm text-zinc-500">진행 기간에 해당하는 프로그램이 생기면 참여율이 표시됩니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
