import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { ProgramMemberChart } from "@/components/admin/program-member-chart";
import { RecentSignupChart } from "@/components/admin/recent-signup-chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAdminDateTime } from "@/lib/admin/format";
import {
  getAdminHomeOverview,
  getAdminProgramMemberChartStats,
  getAdminProgramApplicationsPage,
  getAdminRecentProgramSessionReviews,
  getAdminRecentSignupStats,
  requireAdminUser,
} from "@/lib/admin/server";

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

function getReviewStatusLabel(status: "submitted" | "reviewed") {
  return status === "reviewed" ? "답변 완료" : "미답변";
}

function formatTimeAgo(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));

  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "어제";
  if (diffDays < 14) return `${diffDays}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(new Date(timestamp));
}

export default async function TenantAdminHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, user } = await requireAdminUser(tenantSlug);
  const [overview, pendingApplications, recentSignupStats, programMemberStats, recentFeedback, recentPendingFeedback] = await Promise.all([
    getAdminHomeOverview(supabase, tenantSlug, user),
    getAdminProgramApplicationsPage(supabase, tenantSlug, {
      query: "",
      filter: "pending",
      page: 1,
      pageSize: 10,
    }),
    getAdminRecentSignupStats(supabase, tenantSlug),
    getAdminProgramMemberChartStats(supabase, tenantSlug, user),
    getAdminRecentProgramSessionReviews(supabase, tenantSlug, user),
    getAdminRecentProgramSessionReviews(supabase, tenantSlug, user, { status: "submitted", limit: 3 }),
  ]);
  const recentPendingApplications = pendingApplications.items.slice(0, 5);
  const recentFeedbackPreview = [
    ...recentPendingFeedback,
    ...recentFeedback.filter((review) => !recentPendingFeedback.some((pendingReview) => pendingReview.id === review.id)),
  ].slice(0, 3);
  const signupTotal = recentSignupStats.reduce((sum, item) => sum + item.count, 0);
  const todaySignupCount = recentSignupStats[recentSignupStats.length - 1]?.count ?? overview.todaySignupMemberCount;

  return (
    <AdminPageShell
      title="Dashboard"
      description={`${overview.displayName}님 환영합니다. 오늘 처리할 업무와 운영 지표를 한눈에 확인하세요.`}
    >
      <div className="space-y-4">
        <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-10">
          <Card className="min-w-0 gap-4 rounded-2xl border-zinc-200 bg-white py-4 shadow-none lg:col-span-5">
            <CardHeader className="flex flex-row items-start justify-between gap-4 px-5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-zinc-950">최근 멤버쉽 신청</CardTitle>
                  <Badge variant="secondary" className="border-amber-200 bg-amber-100 text-amber-900">
                    대기 {formatCount(pendingApplications.total)}건
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500">멤버쉽 부여 대기 중인 최근 신청</p>
              </div>
              <Link
                href={`/t/${tenantSlug}/admin/membership-grants`}
                aria-label="멤버쉽 부여 관리로 이동"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </CardHeader>
            <CardContent className="flex min-h-[248px] flex-col px-5">
              {recentPendingApplications.length > 0 ? (
                <div className="space-y-3">
                  {recentPendingApplications.map((application) => (
                    <div key={application.id} className="flex min-w-0 items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarImage src={application.user_avatar_url ?? undefined} alt={`${application.user_name} 프로필`} />
                        <AvatarFallback>{getInitial(application.user_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="truncate text-sm font-medium text-zinc-950">{application.user_name}</p>
                          <p className="truncate text-xs text-zinc-500">{application.user_email || application.user_phone_number || application.user_id}</p>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                          <span className="max-w-full truncate text-zinc-700">{application.program_title}</span>
                          <span className="hidden text-zinc-300 sm:inline">·</span>
                          <span>{formatAdminDateTime(application.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center text-sm text-zinc-500">
                  대기 중인 멤버쉽 신청이 없습니다.
                </div>
              )}

            </CardContent>
          </Card>

          <Card className="min-w-0 gap-4 rounded-2xl border-zinc-200 bg-white py-4 shadow-none lg:col-span-5">
            <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-zinc-950">최신 피드백 현황</CardTitle>
                  <Badge variant="secondary" className="border-amber-200 bg-amber-100 text-amber-900">
                    미답변 {formatCount(overview.pendingSessionReviewCount)}건
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500">미답변을 우선으로 보여주는 최근 유저 피드백</p>
              </div>
              <Link
                href={`/t/${tenantSlug}/admin/session-reviews`}
                aria-label="운동 후기 관리로 이동"
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 focus-visible:ring-offset-2"
              >
                <ArrowUpRight className="size-4" />
              </Link>
            </CardHeader>
            <CardContent className="px-5">
              {recentFeedbackPreview.length > 0 ? (
                <div className="divide-y divide-zinc-100">
                  {recentFeedbackPreview.map((review) => (
                    <div key={review.id} className="flex min-w-0 gap-2.5 py-2.5 first:pt-0 last:pb-0">
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={review.user_avatar_url ?? undefined} alt={`${review.user_name} 프로필`} />
                        <AvatarFallback>{getInitial(review.user_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-medium text-zinc-950">{review.user_name}</p>
                          <Badge
                            variant="outline"
                            className={
                              review.status === "reviewed"
                                ? "shrink-0 border-emerald-200 bg-emerald-50 px-1.5 py-0 text-[11px] text-emerald-700"
                                : "shrink-0 border-amber-200 bg-amber-50 px-1.5 py-0 text-[11px] text-amber-700"
                            }
                          >
                            {getReviewStatusLabel(review.status)}
                          </Badge>
                        </div>
                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
                          <span className="truncate text-zinc-700">{review.program_title}</span>
                          <span className="shrink-0 text-zinc-300">·</span>
                          <span className="truncate">{review.session_title}</span>
                          <span className="shrink-0 text-zinc-300">·</span>
                          <span className="shrink-0" suppressHydrationWarning>
                            {formatTimeAgo(review.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-sm leading-5 text-zinc-600">{review.completion_note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-500">
                  최근 등록된 피드백이 없습니다.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0 gap-4 rounded-2xl border-zinc-200 bg-white py-4 shadow-none lg:col-span-3">
            <CardHeader className="px-5">
              <CardTitle className="text-lg font-semibold text-zinc-950">최근 일주일 회원 가입 현황</CardTitle>
              <p className="text-sm text-zinc-500">오늘 포함 최근 7일 가입 추이</p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-5 px-5">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-zinc-950">+{formatCount(signupTotal)}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  오늘 <span className="text-emerald-600">{formatCount(todaySignupCount)}명</span> 가입
                </p>
              </div>

              <div className="mt-auto">
                <RecentSignupChart items={recentSignupStats} />
              </div>
            </CardContent>
          </Card>

          <ProgramMemberChart stats={programMemberStats} className="md:col-span-2 lg:col-span-7" />
        </div>
      </div>
    </AdminPageShell>
  );
}
