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
    <div className="min-w-29 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold tabular-nums text-ink-emphasis">{value}%</span>
        <span className="text-caption text-ink-faint">{label}</span>
      </div>
      <Progress
        value={value}
        aria-label={`${label} ${value}%`}
        appearance="success" className="h-1.5"
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
      <header className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge appearance="success-subtle">OWNER REPORT</Badge>
            <span className="text-xs text-ink-faint">{report.rangeLabel}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-emphasis sm:text-title">월별 분석</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-subtle">
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
              className="h-9 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink-strong shadow-xs outline-none focus:border-success-strong focus:ring-2 focus:ring-success-soft"
            />
            <Button type="submit" appearance="ink">조회</Button>
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

      <section aria-label="월간 핵심 지표" className="grid overflow-hidden rounded-xl border border-line bg-white sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item, index) => (
          <article
            key={item.label}
            className={`p-5 ${index > 0 ? "border-t border-surface-muted sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 xl:border-l" : ""} ${index > 1 ? "xl:border-t-0" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-ink-subtle">{item.label}</p>
              <item.icon className="size-4 text-ink-faint" aria-hidden />
            </div>
            <p className="mt-4 text-3xl font-semibold tabular-nums tracking-tight text-ink-emphasis">{item.value}</p>
            <p className="mt-2 text-xs text-ink-subtle">{item.detail}</p>
          </article>
        ))}
      </section>

      {report.summary.reviewCount === 0 ? (
        <section className="rounded-xl border border-dashed border-line-strong bg-white px-6 py-16 text-center">
          <FileText className="mx-auto size-7 text-line-strong" aria-hidden />
          <h2 className="mt-4 text-base font-semibold text-ink">이 달에는 등록된 후기가 없습니다</h2>
          <p className="mt-2 text-sm text-ink-subtle">다른 달을 선택하면 해당 월의 후기 분석을 확인할 수 있습니다.</p>
        </section>
      ) : (
        <>
          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]">
            <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-white" aria-labelledby="program-analysis-title">
              <div className="border-b border-surface-muted px-5 py-4">
                <h2 id="program-analysis-title" className="text-base font-semibold text-ink-emphasis">프로그램별 답변 현황</h2>
                <p className="mt-1 text-xs text-ink-subtle">선택한 달에 등록된 후기 기준</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-190 text-left text-sm">
                  <thead className="border-b border-surface-muted bg-surface-subtle/80 text-xs text-ink-subtle">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 font-medium">프로그램</th>
                      <th scope="col" className="px-4 py-3.5 font-medium">답변율</th>
                      <th scope="col" className="px-4 py-3.5 text-right font-medium">미답변</th>
                      <th scope="col" className="px-4 py-3.5 text-right font-medium">중앙 응답</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-medium">평균 길이</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-muted">
                    {report.programs.map((program) => (
                      <tr key={program.id} className="transition-colors hover:bg-surface-subtle/70">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <p className="max-w-70 truncate font-medium text-ink">{program.title}</p>
                            {program.isPublic ? <Badge variant="outline" appearance="muted-caption">공개</Badge> : null}
                          </div>
                          <p className="mt-1 text-caption tabular-nums text-ink-faint">{program.period}</p>
                        </td>
                        <td className="px-4 py-4">
                          <RateBar value={program.responseRate} label={`${program.answeredCount}/${program.reviewCount}`} />
                        </td>
                        <td className="px-4 py-4 text-right font-medium tabular-nums text-ink-secondary">{count(program.pendingCount)}건</td>
                        <td className="px-4 py-4 text-right tabular-nums text-ink-muted">{formatHours(program.medianResponseHours)}</td>
                        <td className="px-5 py-4 text-right tabular-nums text-ink-muted">{program.averageLength > 0 ? `${count(program.averageLength)}자` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-line bg-white p-5" aria-labelledby="weekly-title">
              <div>
                <h2 id="weekly-title" className="text-base font-semibold text-ink-emphasis">주차별 흐름</h2>
                <p className="mt-1 text-xs text-ink-subtle">후기 유입과 현재 답변 완료율</p>
              </div>
              <div className="mt-6 space-y-5">
                {report.weeks.map((week) => (
                  <div key={week.week}>
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <div>
                        <span className="text-sm font-medium text-ink-strong">{week.week}주차</span>
                        <span className="ml-2 text-caption text-ink-faint">{week.label}</span>
                      </div>
                      <span className="text-xs tabular-nums text-ink-subtle">{week.answeredCount}/{week.reviewCount}건</span>
                    </div>
                    <Progress
                      value={week.responseRate}
                      aria-label={`${week.week}주차 답변율 ${week.responseRate}%`}
                      appearance="ink" className="h-2"
                    />
                    <p className="mt-1.5 text-right text-xs font-semibold tabular-nums text-ink-secondary">{week.responseRate}%</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

        </>
      )}

      {report.coaches.length > 0 && (
          <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-white" aria-labelledby="coach-analysis-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-surface-muted px-5 py-4">
              <div>
                <h2 id="coach-analysis-title" className="text-base font-semibold text-ink-emphasis">코치별 답변 분석</h2>
                <p className="mt-1 text-xs text-ink-subtle">현재 활동 코치(답변 0건 포함)와 해당 월 후기의 실제 답변자 · 기여도는 전체 완료 답변 중 비중입니다.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-subtle">
                <Users className="size-3.5" aria-hidden /> 현재 활동 코치 {report.summary.activeCoachCount}명
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-205 text-left text-sm">
                <thead className="border-b border-surface-muted bg-surface-subtle/80 text-xs text-ink-subtle">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 font-medium">코치</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">답변 수</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">처리 기여도</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">평균 / 중앙 길이</th>
                    <th scope="col" className="px-4 py-3.5 text-right font-medium">중앙 응답</th>
                    <th scope="col" className="px-5 py-3.5 text-right font-medium">24h / 48h 내</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted">
                  {report.coaches.map((coach, index) => (
                    <tr key={coach.userId} className="transition-colors hover:bg-surface-subtle/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-ink-muted">{index + 1}</span>
                          <span className="font-medium text-ink">{coach.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold tabular-nums text-ink">{count(coach.replyCount)}건</td>
                      <td className="px-4 py-4 text-right tabular-nums text-ink-muted">{coach.contributionRate}%</td>
                      <td className="px-4 py-4 text-right tabular-nums text-ink-muted">
                        {coach.replyCount > 0 ? `${count(coach.averageLength)} / ${count(coach.medianLength)}자` : "—"}
                      </td>
                      <td className="px-4 py-4 text-right tabular-nums text-ink-muted">{formatHours(coach.medianResponseHours)}</td>
                      <td className="px-5 py-4 text-right tabular-nums text-ink-muted">{formatRate(coach.within24Rate)} / {formatRate(coach.within48Rate)}</td>
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
            <section className="rounded-xl border border-line bg-white p-5" aria-labelledby="backlog-title">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="backlog-title" className="text-base font-semibold text-ink-emphasis">미답변 에이징</h2>
                  <p className="mt-1 text-xs text-ink-subtle">현재까지 답변이 완료되지 않은 후기</p>
                </div>
                <Badge variant={report.summary.pendingCount > 0 ? "destructive" : "secondary"}>{report.summary.pendingCount}건</Badge>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line sm:grid-cols-4">
                {[
                  ["24시간 미만", report.backlog.under1Day],
                  ["1–3일", report.backlog.oneTo3Days],
                  ["3–7일", report.backlog.threeTo7Days],
                  ["7일 이상", report.backlog.over7Days],
                ].map(([label, value]) => (
                  <div key={String(label)} className="bg-white px-4 py-4">
                    <p className="text-caption text-ink-subtle">{label}</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-ink-emphasis">{value}건</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-ink-subtle">
                <AlertCircle className="size-3.5 text-warning-strong" aria-hidden />
                가장 오래된 미답변 {report.backlog.oldestDays === null ? "없음" : `${report.backlog.oldestDays}일`}
              </p>
            </section>

            <section className="rounded-xl border border-success-line bg-success-surface/50 p-5" aria-labelledby="insights-title">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-success-ink" aria-hidden />
                <h2 id="insights-title" className="text-base font-semibold text-ink-emphasis">이번 달 핵심 인사이트</h2>
              </div>
              {report.insights.length > 0 ? (
                <ul className="mt-5 space-y-3">
                  {report.insights.map((insight) => (
                    <li key={insight} className="flex gap-3 text-sm leading-6 text-ink-secondary">
                      <Lightbulb className="mt-1 size-4 shrink-0 text-success-ink" aria-hidden />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-sm text-ink-subtle">분석할 데이터가 충분하지 않습니다.</p>
              )}
            </section>
          </div>
        </>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-caption leading-5 text-ink-faint">
        <p>답변 완료는 reviewed 상태와 코치 피드백이 모두 있는 경우로 집계합니다. 코치별 수치는 실제 reviewed_by 기준입니다.</p>
        <p suppressHydrationWarning>생성 {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}</p>
      </footer>
    </div>
  );
}
