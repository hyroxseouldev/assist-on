"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AdminProgramFeedbackAchievementStats } from "@/lib/admin/types";

type ProgramFeedbackAchievementCardProps = {
  stats: AdminProgramFeedbackAchievementStats;
  className?: string;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatRate(value: number, denominator: number) {
  return denominator > 0 ? `${value}%` : "-";
}

function formatDateRange(start: string, end: string) {
  return `${start.replaceAll("-", ".")} - ${end.replaceAll("-", ".")}`;
}

export function ProgramFeedbackAchievementCard({ stats, className }: ProgramFeedbackAchievementCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasTargets = stats.programs.some((program) => program.review_total_count > 0);
  const sortedPrograms = [...stats.programs].sort((a, b) => {
    const aHasTargets = a.review_total_count > 0;
    const bHasTargets = b.review_total_count > 0;

    if (aHasTargets !== bHasTargets) {
      return aHasTargets ? -1 : 1;
    }

    return b.completion_rate - a.completion_rate;
  });
  const listVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  };
  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 14,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.42,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col gap-2 px-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-lg font-semibold text-zinc-950">최근 7일 프로그램별 피드백 달성률</CardTitle>
          <p className="text-sm text-zinc-500">최근 7일 등록된 회원 후기의 코치 답변 완료율입니다.</p>
        </div>
        <p className="shrink-0 text-xs text-zinc-500">{formatDateRange(stats.range_start, stats.range_end)}</p>
      </CardHeader>
      <CardContent className="px-5">
        {hasTargets ? (
          <motion.div className="space-y-4" variants={listVariants} initial="hidden" animate="visible">
            {sortedPrograms.map((program) => {
              const hasReviewTotal = program.review_total_count > 0;

              return (
                <motion.div key={program.program_id} className="space-y-2.5" variants={itemVariants}>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-950">{program.program_title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        답변 {formatCount(program.reviewed_count)}/{formatCount(program.review_total_count)}건
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-zinc-950">
                        {formatRate(program.completion_rate, program.review_total_count)}
                      </p>
                    </div>
                  </div>
                  <Progress value={hasReviewTotal ? program.completion_rate : 0} aria-label={`${program.program_title} 답변 완료율`} />
                  <p className="text-xs text-zinc-500">{hasReviewTotal ? "등록된 후기 기준" : "최근 7일 후기 없음"}</p>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center"
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-sm font-medium text-zinc-900">최근 7일 등록된 피드백이 없습니다.</p>
            <p className="mt-2 text-sm text-zinc-500">공개 프로그램에 회원 후기가 생기면 답변율이 표시됩니다.</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
