import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  MessageCircle,
  Users,
  UserPlus,
} from "lucide-react";

import { ProgramMemberChart } from "@/components/admin/program-member-chart";
import { RecentSignupChart } from "@/components/admin/recent-signup-chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import type {
  getAdminHomeOverview,
  getAdminProgramApplicationsPage,
  getAdminRecentSignupStats,
} from "@/lib/admin/server";
import type {
  AdminProgramMemberChartStats,
  AdminProgramMissionParticipationStats,
  AdminProgramFeedbackAchievementStats,
  AdminRecentProgramSessionReviewRow,
} from "@/lib/admin/types";
import { formatAdminDateTime } from "@/lib/admin/format";

type AdminDashboardProps = {
  basePath: string;
  overview: Awaited<ReturnType<typeof getAdminHomeOverview>>;
  pendingApplications: Awaited<
    ReturnType<typeof getAdminProgramApplicationsPage>
  >;
  recentSignupStats: Awaited<ReturnType<typeof getAdminRecentSignupStats>>;
  programMemberStats: AdminProgramMemberChartStats;
  missionParticipationStats: AdminProgramMissionParticipationStats;
  feedbackAchievementStats: AdminProgramFeedbackAchievementStats;
  recentFeedback: AdminRecentProgramSessionReviewRow[];
};

const count = (value: number) => new Intl.NumberFormat("ko-KR").format(value);
const linkStyle =
  "inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-zinc-500 transition hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4";

function PersonAvatar({ name, image }: { name: string; image: string | null }) {
  return (
    <Avatar className="size-9 shrink-0">
      <AvatarImage src={image ?? undefined} alt="" />
      <AvatarFallback className="bg-zinc-100 text-xs text-zinc-600">
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
    <div className="min-w-[105px] space-y-2">
      <p className="text-lg font-semibold tabular-nums tracking-tight text-zinc-950">
        {denominator > 0 ? `${value}%` : "—"}
      </p>
      <Progress
        value={value}
        aria-label={label}
        className="h-1.5 bg-emerald-50 [&_[data-slot=progress-indicator]]:bg-emerald-600"
      />
      <p className="text-xs tabular-nums text-zinc-500">
        {denominator > 0
          ? `${count(numerator)} / ${count(denominator)}회`
          : "집계 대상 없음"}
      </p>
    </div>
  );
}

export function AdminDashboard({
  basePath,
  overview,
  pendingApplications,
  recentSignupStats,
  programMemberStats,
  missionParticipationStats,
  feedbackAchievementStats,
  recentFeedback,
}: AdminDashboardProps) {
  const programs = missionParticipationStats.programs;
  const expected = programs.reduce((sum, p) => sum + p.expected_count, 0);
  const completed = programs.reduce((sum, p) => sum + p.participated_count, 0);
  const participation =
    expected > 0 ? `${Math.round((completed / expected) * 100)}%` : "—";
  const signups = recentSignupStats.reduce((sum, item) => sum + item.count, 0);
  const feedbackById = new Map(
    feedbackAchievementStats.programs.map((p) => [p.program_id, p]),
  );
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date());
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
    <div className="min-w-0 space-y-7 px-2 pb-6 pt-2 sm:pt-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">
            대시보드
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {overview.displayName}님, 오늘의 프로그램과 코칭 현황을 확인하세요.
          </p>
        </div>
        <p className="pt-2 text-xs text-zinc-500" suppressHydrationWarning>
          {date}
        </p>
      </header>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] 2xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="min-w-0 space-y-7">
          <section
            aria-label="핵심 운영 지표"
            className="grid divide-y divide-zinc-100 rounded-xl border border-zinc-200/80 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0"
          >
            {metrics.map((metric) => (
              <div key={metric.title} className="flex items-start gap-3 p-5">
                <metric.icon
                  className="mt-1 size-5 shrink-0 text-zinc-700"
                  aria-hidden
                />
                <div>
                  <p className="text-xs font-medium text-zinc-600">
                    {metric.title}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-zinc-950">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-[11px] leading-5 text-zinc-500">
                    {metric.caption}
                  </p>
                </div>
              </div>
            ))}
          </section>

          <section aria-labelledby="program-overview-title" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2
                  id="program-overview-title"
                  className="text-lg font-semibold tracking-tight text-zinc-950"
                >
                  모바일 공개 프로그램
                </h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  미션 참여 현황과 최근 7일 코치 답변율을 함께 확인하세요.
                </p>
              </div>
              <Link href={`${basePath}/sessions`} className={linkStyle}>
                프로그램 운동 보기 <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white">
              <table className="w-full min-w-[520px] text-left">
                <caption className="sr-only">
                  현재 진행 중인 모바일 공개 프로그램별 미션 참여율과 최근 7일
                  코치 답변율
                </caption>
                <thead className="border-b border-zinc-100 bg-zinc-50/80 text-xs text-zinc-500">
                  <tr>
                    <th scope="col" className="w-[40%] px-5 py-4 font-medium">
                      프로그램
                    </th>
                    <th scope="col" className="px-4 py-4 font-medium">
                      미션 참여율
                      <span className="mt-1 block text-[10px] font-normal">
                        수행 / 참여 가능 미션
                      </span>
                    </th>
                    <th scope="col" className="px-4 py-4 font-medium">
                      코치 답변율
                      <span className="mt-1 block text-[10px] font-normal">
                        최근 7일 · 답변 / 후기
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {programs.map((program) => {
                    const feedback = feedbackById.get(program.program_id);
                    return (
                      <tr
                        key={program.program_id}
                        className="transition-colors hover:bg-zinc-50/60"
                      >
                        <th scope="row" className="px-5 py-6 align-middle">
                          <p className="text-sm font-medium leading-6 text-zinc-900">
                            {program.program_title}
                          </p>
                          <p className="mt-2 text-xs font-normal text-zinc-500">
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
                        className="px-5 py-12 text-center text-sm text-zinc-500"
                      >
                        현재 진행 중인 모바일 공개 프로그램이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-zinc-400">
              미션 참여율은 회원별 이용 기간과 기수 일정을 반영합니다. 답변율
              집계: {feedbackAchievementStats.range_start} ~{" "}
              {feedbackAchievementStats.range_end}
            </p>
          </section>
          <ProgramMemberChart
            stats={programMemberStats}
            className="rounded-xl border-zinc-200/80"
          />
          <section
            className="rounded-xl border border-zinc-200/80 bg-white p-5"
            aria-labelledby="signup-title"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="signup-title"
                  className="text-base font-semibold text-zinc-950"
                >
                  최근 일주일 회원 가입
                </h2>
                <p className="mt-1 text-xs text-zinc-500">
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
        </div>

        <aside
          className="order-first min-w-0 rounded-xl border border-zinc-200/80 bg-white p-5 xl:order-none xl:p-6"
          aria-labelledby="action-title"
        >
          <h2
            id="action-title"
            className="text-lg font-semibold tracking-tight text-zinc-950"
          >
            오늘 처리할 업무
          </h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            회원들이 기다리는 피드백과 신청을 확인하세요.
          </p>
          <div className="divide-y divide-zinc-100">
            <div className="flex flex-wrap items-center justify-between gap-3 py-6">
              <div className="flex items-center gap-3">
                <MessageCircle className="size-5 text-zinc-600" aria-hidden />
                <div>
                  <p className="text-xs text-zinc-500">최근 7일 미답변</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {count(overview.pendingSessionReviewCount)}
                    <span className="ml-1 text-base font-medium">건</span>
                  </p>
                </div>
              </div>
              <Link
                href={`${basePath}/session-reviews`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-medium text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                피드백 확인 <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 py-6">
              <div className="flex items-center gap-3">
                <Clock3 className="size-5 text-zinc-600" aria-hidden />
                <div>
                  <p className="text-xs text-zinc-500">멤버십 승인 대기</p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
                    {count(pendingApplications.total)}
                    <span className="ml-1 text-base font-medium">건</span>
                  </p>
                </div>
              </div>
              <Link
                href={`${basePath}/membership-grants`}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-700/30 px-4 py-2.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
              >
                신청 내역 보기 <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
          <section className="border-t border-zinc-100 py-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">최근 피드백</h3>
              <Link href={`${basePath}/session-reviews`} className={linkStyle}>
                전체 보기 <ArrowRight className="size-3" />
              </Link>
            </div>
            <p className="mb-4 text-xs text-zinc-500">최근 7일 · 미답변 우선</p>
            <div className="space-y-5">
              {recentFeedback.map((review) => (
                <Link
                  key={review.id}
                  href={`${basePath}/session-reviews`}
                  className="group flex gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <PersonAvatar
                    name={review.user_name}
                    image={review.user_avatar_url}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-medium text-zinc-900 group-hover:text-emerald-700">
                        {review.user_name}
                      </p>
                      <span
                        className={
                          review.status === "submitted"
                            ? "text-[10px] text-amber-700"
                            : "text-[10px] text-emerald-700"
                        }
                      >
                        {review.status === "submitted" ? "미답변" : "답변 완료"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-zinc-500">
                      {review.program_title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">
                      {review.completion_note}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {formatAdminDateTime(review.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
              {recentFeedback.length === 0 && (
                <p className="py-4 text-sm text-zinc-500">
                  최근 7일 등록된 피드백이 없습니다.
                </p>
              )}
            </div>
          </section>
          <section className="border-t border-zinc-100 pt-6">
            <div className="mb-5 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">최근 승인 대기 신청</h3>
              <Link
                href={`${basePath}/membership-grants`}
                className={linkStyle}
              >
                전체 보기 <ArrowRight className="size-3" />
              </Link>
            </div>
            <div className="space-y-5">
              {pendingApplications.items.slice(0, 3).map((application) => (
                <Link
                  key={application.id}
                  href={`${basePath}/membership-grants`}
                  className="group flex gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <PersonAvatar
                    name={application.user_name}
                    image={application.user_avatar_url}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 group-hover:text-emerald-700">
                      {application.user_name}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                      {application.program_title}
                    </p>
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {formatAdminDateTime(application.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
              {pendingApplications.items.length === 0 && (
                <p className="py-4 text-sm text-zinc-500">
                  승인 대기 중인 신청이 없습니다.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
