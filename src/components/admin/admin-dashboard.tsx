import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Users,
  UserPlus,
} from "lucide-react";

import { RecentSignupChart } from "@/components/admin/recent-signup-chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import type {
  getAdminRecentSignupStats,
} from "@/lib/admin/server";
import type {
  AdminProgramMissionParticipationStats,
  AdminProgramFeedbackAchievementStats,
  AdminRecentProgramSessionReviewRow,
} from "@/lib/admin/types";
import { formatAdminDateTime } from "@/lib/admin/format";

type DashboardLinks = { basePath: string; readOnly?: boolean };
type SignupStats = Awaited<ReturnType<typeof getAdminRecentSignupStats>>;

const count = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
const linkStyle =
  "inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-ink-subtle transition hover:text-success-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-strong focus-visible:ring-offset-4";

function DashboardLink({
  readOnly,
  staticWhenReadOnly = false,
  ...props
}: ComponentProps<typeof Link> & { readOnly: boolean; staticWhenReadOnly?: boolean }) {
  if (readOnly) {
    return staticWhenReadOnly ? <div className={props.className}>{props.children}</div> : null;
  }
  return <Link {...props} />;
}

function PersonAvatar({ name, image }: { name: string; image: string | null }) {
  return (
    <Avatar className="size-9 shrink-0">
      <AvatarImage src={image ?? undefined} alt="" />
      <AvatarFallback appearance="muted">
        {name.trim().slice(0, 1) || "U"}
      </AvatarFallback>
    </Avatar>
  );
}

function Rate({
  value,
  numerator,
  denominator,
  label,
}: {
  value: number;
  numerator: number;
  denominator: number;
  label: string;
}) {
  return (
    <div className="min-w-26.25 space-y-2">
      <p className="text-lg font-semibold tabular-nums tracking-tight text-ink-emphasis">
        {denominator > 0 ? `${value}%` : "—"}
      </p>
      <Progress
        value={value}
        aria-label={label}
        appearance="success-soft" className="h-1.5"
      />
      <p className="text-xs tabular-nums text-ink-subtle">
        {denominator > 0
          ? `${count(numerator)} / ${count(denominator)}회`
          : "집계 대상 없음"}
      </p>
    </div>
  );
}

export function AdminDashboard({ children, feedback, displayName, basePath, readOnly = false }: DashboardLinks & {
  children: ReactNode; feedback: ReactNode; displayName: string;
}) {
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
  return <div className="min-w-0 space-y-7 px-2 pb-6 pt-2 sm:pt-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink-emphasis sm:text-title">
            대시보드
          </h1>
          <p className="mt-2 text-sm text-ink-subtle">
            {displayName}님, 오늘의 프로그램과 코칭 현황을 확인하세요.
          </p>
        </div>
        <p className="pt-2 text-xs text-ink-subtle" suppressHydrationWarning>
          {date}
        </p>
      </header>

      {readOnly ? (
        <nav aria-label="매니저 바로가기" className="flex flex-wrap gap-3">
          <Link href={`${basePath}/program-changes`} className={linkStyle}>
            참여 프로그램 변경 <ArrowRight className="size-3" />
          </Link>
          <Link href={`${basePath}/program-preregistrations`} className={linkStyle}>
            프로그램 사전등록 <ArrowRight className="size-3" />
          </Link>
        </nav>
      ) : null}

    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] 2xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
      <div className="min-w-0 space-y-7">{children}</div>
      <div className="order-first min-w-0 xl:order-none">{feedback}</div>
    </div>
  </div>;
}

export function DashboardMetrics({ missionParticipationStats, recentSignupStats }: {
  missionParticipationStats: AdminProgramMissionParticipationStats; recentSignupStats: SignupStats;
}) {
  const programs = missionParticipationStats.programs;
  const expected = programs.reduce((sum, p) => sum + p.expected_count, 0);
  const completed = programs.reduce((sum, p) => sum + p.participated_count, 0);
  const participation =
    expected > 0 ? `${Math.round((completed / expected) * 100)}%` : "—";
  const signups = recentSignupStats.reduce((sum, item) => sum + item.count, 0);
  const metrics = [
    {
      title: "미션 참여율",
      value: participation,
      caption: "참여 가능 미션 대비 수행",
      icon: Users,
    },
    {
      title: "공개 프로그램",
      value: `${count(programs.length)}개`,
      caption: "현재 진행 중 · 모바일 공개",
      icon: BookOpen,
    },
    {
      title: "최근 7일 신규 회원",
      value: `${count(signups)}명`,
      caption: "오늘 포함 최근 7일",
      icon: UserPlus,
    },
  ];

  return (
          <section
            aria-label="핵심 운영 지표"
            className="grid divide-y divide-surface-muted rounded-xl border border-line/80 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            {metrics.map((metric) => (
              <div key={metric.title} className="flex items-start gap-3 p-5">
                <metric.icon
                  className="mt-1 size-5 shrink-0 text-ink-secondary"
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-medium text-ink-muted">
                    {metric.title}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink-emphasis">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-caption leading-5 text-ink-subtle">
                    {metric.caption}
                  </p>
                </div>
              </div>
            ))}
          </section>

  );
}

export function DashboardPrograms({ missionParticipationStats, feedbackAchievementStats, basePath, readOnly = false }: DashboardLinks & {
  missionParticipationStats: AdminProgramMissionParticipationStats; feedbackAchievementStats: AdminProgramFeedbackAchievementStats;
}) {
  const programs = missionParticipationStats.programs;
  const feedbackById = new Map(feedbackAchievementStats.programs.map((p) => [p.program_id, p]));
  return (
          <section aria-labelledby="program-overview-title" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="program-overview-title"
                  className="text-lg font-semibold tracking-tight text-ink-emphasis"
                >
                  모바일 공개 프로그램
                </h2>
                <p className="mt-1 text-xs leading-5 text-ink-subtle">
                  미션 참여 현황과 최근 7일 코치 답변율을 함께 확인하세요.
                </p>
              </div>
              <DashboardLink readOnly={readOnly} href={`${basePath}/sessions`} className={linkStyle}>
                프로그램 운동 보기 <ArrowRight className="size-3.5" />
              </DashboardLink>
            </div>
            <div className="overflow-x-auto rounded-xl border border-line/80 bg-white">
              <table className="w-full min-w-130 text-left">
                <caption className="sr-only">
                  현재 진행 중인 모바일 공개 프로그램별 미션 참여율과 최근 7일
                  코치 답변율
                </caption>
                <thead className="border-b border-surface-muted bg-surface-subtle/80 text-xs text-ink-subtle">
                  <tr>
                    <th scope="col" className="w-2/5 px-5 py-4 font-medium">
                      프로그램
                    </th>
                    <th scope="col" className="px-4 py-4 font-medium">
                      미션 참여율
                      <span className="mt-1 block text-2xs font-normal">
                        수행 / 참여 가능 미션
                      </span>
                    </th>
                    <th scope="col" className="px-4 py-4 font-medium">
                      코치 답변율
                      <span className="mt-1 block text-2xs font-normal">
                        최근 7일 · 답변 / 후기
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-muted">
                  {programs.map((program) => {
                    const feedback = feedbackById.get(program.program_id);
                    return (
                      <tr
                        key={program.program_id}
                        className="transition-colors hover:bg-surface-subtle/60"
                      >
                        <th scope="row" className="px-5 py-6 align-middle">
                          <p className="text-sm font-medium leading-6 text-ink">
                            {program.program_title}
                          </p>
                          <p className="mt-2 text-xs font-normal text-ink-subtle">
                            활성 회원 {count(program.active_member_count)}명 ·
                            대상 미션 {count(program.mission_count)}개
                          </p>
                        </th>
                        <td className="px-4 py-6">
                          <Rate
                            value={program.participation_rate}
                            numerator={program.participated_count}
                            denominator={program.expected_count}
                            label={`${program.program_title} 미션 참여율`}
                          />
                        </td>
                        <td className="px-4 py-6">
                          <Rate
                            value={feedback?.completion_rate ?? 0}
                            numerator={feedback?.reviewed_count ?? 0}
                            denominator={feedback?.review_total_count ?? 0}
                            label={`${program.program_title} 코치 답변율`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {programs.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-12 text-center text-sm text-ink-subtle"
                      >
                        현재 진행 중인 모바일 공개 프로그램이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-caption leading-5 text-ink-faint">
              미션 참여율은 회원별 이용 기간과 기수 일정을 반영합니다. 답변율
              집계: {feedbackAchievementStats.range_start} ~{" "}
              {feedbackAchievementStats.range_end}
            </p>
          </section>
  );
}

export function DashboardSignups({ recentSignupStats }: { recentSignupStats: SignupStats }) {
  const signups = recentSignupStats.reduce((sum, item) => sum + item.count, 0);
  return (
          <section
            className="rounded-xl border border-line/80 bg-white p-5"
            aria-labelledby="signup-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="signup-title"
                  className="text-base font-semibold text-ink-emphasis"
                >
                  최근 일주일 회원 가입
                </h2>
                <p className="mt-1 text-xs text-ink-subtle">
                  오늘 {count(recentSignupStats.at(-1)?.count ?? 0)}명 가입
                </p>
              </div>
              <p className="text-xl font-semibold tabular-nums">
                +{count(signups)}
              </p>
            </div>
            <div className="mt-5">
              <RecentSignupChart items={recentSignupStats} />
            </div>
          </section>
  );
}

export function DashboardFeedback({ pendingCount, recentFeedback, basePath, readOnly = false }: DashboardLinks & {
  pendingCount: number; recentFeedback: AdminRecentProgramSessionReviewRow[];
}) {
  return (
        <aside
          className="order-first min-w-0 rounded-xl border border-line/80 bg-white p-5 xl:order-none xl:p-6"
          aria-labelledby="action-title"
        >
          <h2
            id="action-title"
            className="text-lg font-semibold tracking-tight text-ink-emphasis"
          >
            오늘 처리할 업무
          </h2>
          <p className="mt-1 text-xs leading-5 text-ink-subtle">
            회원들이 기다리는 피드백을 확인하세요.
          </p>
          <div className="divide-y divide-surface-muted">
            <div className="flex flex-wrap items-center justify-between gap-3 py-6">
              <div className="flex items-center gap-3">
                <MessageCircle className="size-5 text-ink-muted" aria-hidden />
                <div>
                  <p className="text-xs text-ink-subtle">최근 7일 미답변</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {count(pendingCount)}
                    <span className="ml-1 text-base font-medium">건</span>
                  </p>
                </div>
              </div>
              <DashboardLink readOnly={readOnly}
                href={`${basePath}/session-reviews`}
                className="inline-flex items-center gap-2 rounded-lg bg-success-ink px-4 py-2.5 text-xs font-medium text-white transition hover:bg-success-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-strong focus-visible:ring-offset-2"
              >
                피드백 확인 <ArrowRight className="size-3.5" />
              </DashboardLink>
            </div>
          </div>
          <section className="border-t border-surface-muted py-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">최근 피드백</h3>
              <DashboardLink readOnly={readOnly} href={`${basePath}/session-reviews`} className={linkStyle}>
                전체 보기 <ArrowRight className="size-3" />
              </DashboardLink>
            </div>
            <p className="mb-4 text-xs text-ink-subtle">최근 7일 · 미답변 우선</p>
            <div className="space-y-5">
              {recentFeedback.map((review) => (
                <DashboardLink readOnly={readOnly}
                  key={review.id}
                  staticWhenReadOnly
                  href={`${basePath}/session-reviews`}
                  className="group flex gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-strong"
                >
                  <PersonAvatar
                    name={review.user_name}
                    image={review.user_avatar_url}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-ink group-hover:text-success-ink">
                        {review.user_name}
                      </p>
                      <span
                        className={
                          review.status === "submitted"
                            ? "text-2xs text-warning-ink"
                            : "text-2xs text-success-ink"
                        }
                      >
                        {review.status === "submitted" ? "미답변" : "답변 완료"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-caption text-ink-subtle">
                      {review.program_title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">
                      {review.completion_note}
                    </p>
                    <p className="mt-1 text-2xs text-ink-faint">
                      {formatAdminDateTime(review.created_at)}
                    </p>
                  </div>
                </DashboardLink>
              ))}
              {recentFeedback.length === 0 && (
                <p className="py-4 text-sm text-ink-subtle">
                  최근 7일 등록된 피드백이 없습니다.
                </p>
              )}
            </div>
          </section>
        </aside>  );
}
