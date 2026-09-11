import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { MonthlyAnalyticsReport as MonthlyAnalyticsReportData } from "@/lib/admin/monthly-analytics";

type MonthlyAnalyticsReportProps = {
  report: MonthlyAnalyticsReportData;
  basePath: string;
  currentMonth: string;
};

const numberFormatter = new Intl.NumberFormat("ko-KR");

function count(value: number) {
  return numberFormatter.format(value);
}

function formatRate(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function formatHours(value: number | null) {
  if (value === null) return "—";
  if (value < 1) return `${Math.max(1, Math.round(value * 60))}분`;
  return `${value}시간`;
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const target = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}`;
}

function RateBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[116px] space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold tabular-nums text-zinc-950">{value}%</span>
        <span className="text-[11px] text-zinc-400">{label}</span>
      </div>
      <Progress
        value={value}
        aria-label={`${label} ${value}%`}
        className="h-1.5 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-emerald-600"
      />
    </div>
  );
}

export function MonthlyAnalyticsReport({ report, basePath, currentMonth }: MonthlyAnalyticsReportProps) {
  const previousMonth = shiftMonth(report.month, -1);
  const nextMonth = shiftMonth(report.month, 1);
  const canMoveNext = nextMonth <= currentMonth;
  const summaryCards = [
    {
      label: "등록 후기",
      value: `${count(report.summary.reviewCount)}건`,
      detail: `${report.monthLabel}에 등록`,
      icon: FileText,
    },
    {
      label: "코치 답변율",
      value: formatRate(report.summary.responseRate),
      detail: `${count(report.summary.answeredCount)} / ${count(report.summary.reviewCount)}건 답변`,
      icon: CheckCircle2,
    },
    {
      label: "중앙 응답 시간",
      value: formatHours(report.summary.medianResponseHours),
      detail: `48시간 내 처리 ${formatRate(report.summary.within48Rate)}`,
      icon: Clock3,
    },
    {
      label: "평균 답변 길이",
      value: report.summary.answeredCount > 0 ? `${count(report.summary.averageLength)}자` : "—",
      detail: `${count(report.summary.activeCoachCount)}명 코치가 답변`,
      icon: MessageSquareText,
    },
  ];

  return (
    <div className="min-w-0 space-y-7 px-2 pb-8 pt-2 sm:pt-3">
      <header className="flex flex-col gap-5 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">OWNER REPORT</Badge>
            <span className="text-xs text-zinc-400">{report.rangeLabel}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">월별 분석</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            후기 등록 월을 기준으로 프로그램의 답변 현황과 코치별 처리 품질을 분석합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="icon" aria-label="이전 달">
            <Link href={`${basePath}/analytics/monthly?month=${previousMonth}`}>
              <ArrowLeft />
            </Link>
          </Button>
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="analytics-month" className="sr-only">분석 월</label>
            <input
              id="analytics-month"
              name="month"
              type="month"
              defaultValue={report.month}
              max={currentMonth}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
            <Button type="submit" className="bg-zinc-950 text-white hover:bg-zinc-800">조회</Button>
          </form>
          {canMoveNext ? (
            <Button asChild variant="outline" size="icon" aria-label="다음 달">
              <Link href={`${basePath}/analytics/monthly?month=${nextMonth}`}>
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="icon" aria-label="다음 달" disabled>
              <ArrowRight />
            </Button>
          )}
        </div>
      </header>

      <section aria-label="월간 핵심 지표" className="grid overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item, index) => (
          <article
            key={item.label}
            className={`p-5 ${index > 0 ? "border-t border-zinc-100 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 xl:border-l" : ""} ${index > 1 ? "xl:border-t-0" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-zinc-500">{item.label}</p>
              <item.icon className="size-4 text-zinc-400" aria-hidden />
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-zinc-950">{item.value}</p>
            <p className="mt-2 text-xs text-zinc-500">{item.detail}</p>
          </article>
        ))}
      </section>

      {report.summary.reviewCount === 0 ? (
        <section className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <FileText className="mx-auto size-7 text-zinc-300" aria-hidden />
          <h2 className="mt-4 text-base font-semibold text-zinc-900">이 달에는 등록된 후기가 없습니다</h2>
          <p className="mt-2 text-sm text-zinc-500">다른 달을 선택하면 해당 월의 후기 분석을 확인할 수 있습니다.</p>
        </section>
      ) : (
        <>
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
            <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white" aria-labelledby="program-analysis-title">
              <div className="border-b border-zinc-100 px-5 py-4">
                <h2 id="program-analysis-title" className="text-base font-semibold text-zinc-950">프로그램별 답변 현황</h2>
                <p className="mt-1 text-xs text-zinc-500">선택한 달에 등록된 후기 기준</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs text-zinc-500">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-medium">프로그램</th>
                      <th scope="col" className="px-4 py-3.5 font-medium">답변율</th>
                      <th scope="col" className="px-4 py-3.5 text-right font-medium">미답변</th>
                      <th scope="col" className="px-4 py-3.5 text-right font-medium">중앙 응답</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-medium">평균 길이</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {report.programs.map((program) => (
                      <tr key={program.id} className="transition-colors hover:bg-zinc-50/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <p className="max-w-[280px] truncate font-medium text-zinc-900">{program.title}</p>
                            {program.isPublic ? <Badge variant="outline" className="border-zinc-200 text-[10px] text-zinc-500">공개</Badge> : null}
                          </div>
                          <p className="mt-1 text-[11px] tabular-nums text-zinc-400">{program.period}</p>
                        </td>
                        <td className="px-4 py-4">
                          <RateBar value={program.responseRate} label={`${program.answeredCount}/${program.reviewCount}`} />
                        </td>
                        <td className="px-4 py-4 text-right font-medium tabular-nums text-zinc-700">{count(program.pendingCount)}건</td>
                        <td className="px-4 py-4 text-right tabular-nums text-zinc-600">{formatHours(program.medianResponseHours)}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-zinc-600">{program.averageLength > 0 ? `${count(program.averageLength)}자` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-5" aria-labelledby="weekly-title">
              <div>
                <h2 id="weekly-title" className="text-base font-semibold text-zinc-950">주차별 흐름</h2>
                <p className="mt-1 text-xs text-zinc-500">후기 유입과 현재 답변 완료율</p>
              </div>
              <div className="mt-6 space-y-5">
                {report.weeks.map((week) => (
                  <div key={week.week}>
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <div>
                        <span className="text-sm font-medium text-zinc-800">{week.week}주차</span>
                        <span className="ml-2 text-[11px] text-zinc-400">{week.label}</span>
                      </div>
                      <span className="text-xs tabular-nums text-zinc-500">{week.answeredCount}/{week.reviewCount}건</span>
                    </div>
                    <Progress
                      value={week.responseRate}
                      aria-label={`${week.week}주차 답변율 ${week.responseRate}%`}
                      className="h-2 bg-zinc-100 [&_[data-slot=progress-indicator]]:bg-zinc-800"
                    />
                    <p className="mt-1.5 text-right text-xs font-semibold tabular-nums text-zinc-700">{week.responseRate}%</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </>
      )}

      {report.coaches.length > 0 && (
          <section className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white" aria-labelledby="coach-analysis-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 id="coach-analysis-title" className="text-base font-semibold text-zinc-950">코치별 답변 분석</h2>
                <p className="mt-1 text-xs text-zinc-500">현재 활동 코치(답변 0건 포함)와 해당 월 후기의 실제 답변자 · 기여도는 전체 완료 답변 중 비중입니다.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Users className="size-3.5" aria-hidden /> 현재 활동 코치 {report.summary.activeCoachCount}명
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs text-zinc-500">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-medium">코치</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">답변 수</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">처리 기여도</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">평균 / 중앙 길이</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">중앙 응답</th>
                    <th scope="col" className="px-5 py-3.5 text-right font-medium">24h / 48h 내</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {report.coaches.map((coach, index) => (
                    <tr key={coach.userId} className="transition-colors hover:bg-zinc-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-600">{index + 1}</span>
                          <span className="font-medium text-zinc-900">{coach.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums text-zinc-900">{count(coach.replyCount)}건</td>
                      <td className="px-4 py-4 text-right tabular-nums text-zinc-600">{coach.contributionRate}%</td>
                      <td className="px-4 py-4 text-right tabular-nums text-zinc-600">
                        {coach.replyCount > 0 ? `${count(coach.averageLength)} / ${count(coach.medianLength)}자` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-zinc-600">{formatHours(coach.medianResponseHours)}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-zinc-600">{formatRate(coach.within24Rate)} / {formatRate(coach.within48Rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
      )}

      {report.summary.reviewCount > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-zinc-200 bg-white p-5" aria-labelledby="backlog-title">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="backlog-title" className="text-base font-semibold text-zinc-950">미답변 에이징</h2>
                  <p className="mt-1 text-xs text-zinc-500">현재까지 답변이 완료되지 않은 후기</p>
                </div>
                <Badge variant={report.summary.pendingCount > 0 ? "destructive" : "secondary"}>{report.summary.pendingCount}건</Badge>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-zinc-200 sm:grid-cols-4">
                {[
                  ["24시간 미만", report.backlog.under1Day],
                  ["1–3일", report.backlog.oneTo3Days],
                  ["3–7일", report.backlog.threeTo7Days],
                  ["7일 이상", report.backlog.over7Days],
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-white px-4 py-4">
                    <p className="text-[11px] text-zinc-500">{label}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-zinc-950">{value}건</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                <AlertCircle className="size-3.5 text-amber-600" aria-hidden />
                가장 오래된 미답변 {report.backlog.oldestDays === null ? "없음" : `${report.backlog.oldestDays}일`}
              </p>
            </section>

            <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5" aria-labelledby="insights-title">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-emerald-700" aria-hidden />
                <h2 id="insights-title" className="text-base font-semibold text-zinc-950">이번 달 핵심 인사이트</h2>
              </div>
              {report.insights.length > 0 ? (
                <ul className="mt-5 space-y-3">
                  {report.insights.map((insight) => (
                    <li key={insight} className="flex gap-3 text-sm leading-6 text-zinc-700">
                      <Lightbulb className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-zinc-500">분석할 데이터가 충분하지 않습니다.</p>
              )}
            </section>
          </div>
        </>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 text-[11px] leading-5 text-zinc-400">
        <p>답변 완료는 reviewed 상태와 코치 피드백이 모두 있는 경우로 집계합니다. 코치별 수치는 실제 reviewed_by 기준입니다.</p>
        <p suppressHydrationWarning>생성 {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}</p>
      </footer>
    </div>
  );
}
