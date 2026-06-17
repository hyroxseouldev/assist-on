"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { AdminProgramMemberChartStats } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type ProgramMemberChartProps = {
  stats: AdminProgramMemberChartStats;
  className?: string;
};

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

export function ProgramMemberChart({ stats, className }: ProgramMemberChartProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasPrograms = stats.programs.length > 0;
  const chartConfig = stats.programs.reduce<ChartConfig>((config, program) => {
    config[program.program_id] = {
      label: program.program_title,
      color: program.color,
    };
    return config;
  }, {});
  const chartDescription = stats.data
    .map((month) => {
      const counts = stats.programs
        .map((program) => `${program.program_title} ${formatCount(Number(month[program.program_id] ?? 0))}명`)
        .join(", ");

      return `${month.label}: ${counts}`;
    })
    .join("; ");

  return (
    <Card className={cn("min-w-0 gap-5 rounded-2xl border-zinc-200 bg-white py-5 shadow-none", className)}>
      <CardHeader className="flex flex-col gap-4 px-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-lg font-semibold text-zinc-950">프로그램별 활성 회원 추이</CardTitle>
          <p className="text-sm text-zinc-500">공개중인 프로그램의 최근 6개월 월별 활성 회원 변화를 보여줍니다.</p>
        </div>
        <p className="shrink-0 text-xs text-zinc-500">공개 프로그램 {formatCount(stats.total_program_count)}개</p>
      </CardHeader>
      <CardContent className="space-y-6 px-5">
        {hasPrograms ? (
          <>
            <div className="sr-only" aria-label={`프로그램별 월간 활성 회원 추이: ${chartDescription}`} />
            <ChartContainer config={chartConfig} className="h-[212px] min-h-0 w-full min-w-0 aspect-auto lg:h-[232px]">
              <LineChart data={stats.data} margin={{ left: 12, right: 18, top: 12, bottom: 6 }}>
                <XAxis dataKey="label" hide />
                <YAxis hide allowDecimals={false} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                      formatter={(value, name) => {
                        const program = stats.programs.find((item) => item.program_id === name);

                        return (
                          <div className="flex min-w-[180px] items-center justify-between gap-4">
                            <span className="truncate text-zinc-500">{program?.program_title ?? String(name)}</span>
                            <span className="font-mono font-medium text-zinc-950">{formatCount(Number(value))}명</span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                {stats.programs.map((program) => (
                  <Line
                    key={program.program_id}
                    type="monotone"
                    dataKey={program.program_id}
                    stroke={program.color}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: "white", stroke: program.color }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={!prefersReducedMotion}
                    animationDuration={900}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            </ChartContainer>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-500">
              {stats.programs.map((program) => (
                <span key={program.program_id} className="inline-flex max-w-full items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: program.color }} />
                  <span className="truncate">{program.program_title}</span>
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">공개중인 프로그램이 없습니다.</p>
            <p className="mt-2 text-sm text-zinc-500">프로그램 공개 상태를 공개로 변경하면 월별 활성 회원 추이가 표시됩니다.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
