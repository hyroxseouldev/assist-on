import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, CircleAlert, MessageSquare, Package, Sparkles, Users } from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminHomeOverview, requireAdminUser } from "@/lib/admin/server";
import { cn } from "@/lib/utils";

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

type OverviewCard = {
  label: string;
  value: number;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  accent?: "default" | "warning";
};

export default async function TenantAdminHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, user } = await requireAdminUser(tenantSlug);
  const overview = await getAdminHomeOverview(supabase, tenantSlug, user);

  const firstName = overview.displayName.trim().split(/\s+/)[0] || overview.displayName;
  const stats: OverviewCard[] = [
    {
      label: overview.isScopedToManagedPrograms ? "내 담당 프로그램" : "관리 중인 프로그램",
      value: overview.programCount,
      description: overview.isScopedToManagedPrograms ? "내게 배정된 프로그램 수" : "현재 운영 중인 전체 프로그램",
      href: `/t/${tenantSlug}/admin/program`,
      icon: Package,
    },
    {
      label: overview.isScopedToManagedPrograms ? "담당 프로그램 회원 수" : "프로그램 회원 수",
      value: overview.activeProgramMemberCount,
      description: overview.isScopedToManagedPrograms ? "내 담당 프로그램의 활성 회원 수" : "활성 권한 기준 회원 수",
      href: `/t/${tenantSlug}/admin/all-users`,
      icon: Users,
    },
    {
      label: "등록된 세션 리뷰",
      value: overview.sessionReviewCount,
      description: overview.isScopedToManagedPrograms ? "내 담당 프로그램에 등록된 리뷰" : "회원이 남긴 전체 운동 리뷰",
      href: `/t/${tenantSlug}/admin/session-reviews`,
      icon: MessageSquare,
    },
    {
      label: "미피드백 세션 리뷰",
      value: overview.pendingSessionReviewCount,
      description: overview.isScopedToManagedPrograms ? "내 피드백을 기다리는 리뷰" : "아직 답변을 기다리는 리뷰",
      href: `/t/${tenantSlug}/admin/session-reviews?reviewStatus=submitted`,
      icon: CircleAlert,
      accent: "warning",
    },
  ];

  return (
    <AdminPageShell title="관리 홈" description="오늘 확인할 운영 지표와 코치 액션을 한눈에 모아봤어요.">
      <div className="space-y-6">
        <Card className="overflow-hidden border-zinc-200 bg-linear-to-br from-amber-50 via-white to-rose-50 shadow-sm">
          <CardContent className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-white/90 px-3 py-1 text-xs font-semibold text-amber-700">
                <Sparkles className="size-3.5" />
                오늘의 코치 홈
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
                  {firstName} 코치님, 안녕하세요!
                </h2>
                <p className="text-sm leading-6 text-zinc-600 sm:text-base">
                  오늘도 회원들의 기록을 살펴보고, 기다리고 있는 리뷰에 다정한 피드백을 남겨볼까요?
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:w-[420px]">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">today focus</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                  {formatCount(overview.pendingSessionReviewCount)}
                </p>
                <p className="mt-1 text-sm text-zinc-600">답변이 필요한 세션 리뷰</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
                <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">active members</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
                  {formatCount(overview.activeProgramMemberCount)}
                </p>
                <p className="mt-1 text-sm text-zinc-600">활성 권한 회원</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <Link key={item.label} href={item.href} className="group block">
              <Card
                className={cn(
                  "h-full border-zinc-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  item.accent === "warning" && "border-amber-200 bg-amber-50/50"
                )}
              >
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{formatCount(item.value)}</p>
                    </div>
                    <div
                      className={cn(
                        "flex size-11 items-center justify-center rounded-full border bg-zinc-50 text-zinc-500",
                        item.accent === "warning" && "border-amber-200 bg-amber-100 text-amber-700"
                      )}
                    >
                      <item.icon className="size-5" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-zinc-600">{item.description}</p>
                    <div className="flex items-center gap-1 text-sm font-medium text-zinc-500 transition group-hover:text-zinc-900">
                      <span>바로 보기</span>
                      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="border-zinc-200 bg-white shadow-sm">
          <CardHeader className="gap-2">
            <CardTitle className="text-base">지금 필요한 액션</CardTitle>
            <CardDescription>
              {overview.isScopedToManagedPrograms
                ? "내가 맡은 프로그램의 회원 리뷰부터 확인하면 오늘 코칭 흐름이 훨씬 매끄러워져요."
                : "답변을 기다리는 회원 리뷰부터 확인하면 오늘 운영 흐름이 훨씬 매끄러워져요."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-900">미피드백 세션 리뷰 {formatCount(overview.pendingSessionReviewCount)}건</p>
              <p className="text-sm text-zinc-600">
                {overview.isScopedToManagedPrograms
                  ? "오늘 날짜 기준, 내가 관리하는 프로그램의 미답변 리뷰 화면으로 바로 이동합니다."
                  : "오늘 날짜 기준 미답변 리뷰 화면으로 바로 이동합니다."}
              </p>
            </div>

            <Button asChild className="min-w-[220px]">
              <Link href={`/t/${tenantSlug}/admin/session-reviews?reviewStatus=submitted`}>
                회원 운동 리뷰 남기러 가기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
