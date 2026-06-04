import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { getAdminHomeOverview, requireAdminUser } from "@/lib/admin/server";

function formatCount(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

type CoachHomeItem = {
  title: string;
  description: string;
  metricLabel: string;
  metricValue: string;
  href: string;
};

export default async function TenantAdminHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, user } = await requireAdminUser(tenantSlug);
  const overview = await getAdminHomeOverview(supabase, tenantSlug, user);

  const items: CoachHomeItem[] = [
    {
      title: "프로그램 운동 입력",
      description: "프로그램별 운동 세션을 입력하고 관리합니다.",
      metricLabel: overview.isScopedToManagedPrograms ? "담당 프로그램" : "관리 프로그램",
      metricValue: `${formatCount(overview.programCount)}개`,
      href: `/t/${tenantSlug}/admin/sessions`,
    },
    {
      title: "프로그램 피드백",
      description: "회원이 남긴 프로그램 리뷰에 피드백을 작성합니다.",
      metricLabel: "미피드백 리뷰",
      metricValue: `${formatCount(overview.pendingSessionReviewCount)}건`,
      href: `/t/${tenantSlug}/admin/session-reviews`,
    },
    {
      title: "기록 랭킹",
      description: "Time Trial 기록과 순위를 확인합니다.",
      metricLabel: "기록 등록 회원",
      metricValue: `${formatCount(overview.workoutRecordUserCount)}명`,
      href: `/t/${tenantSlug}/admin/workout-records`,
    },
    {
      title: "주문 내역",
      description: "월별 게스트 주문 접수 내역을 확인합니다.",
      metricLabel: "이번 달 주문",
      metricValue: `${formatCount(overview.monthlyGuestOrderCount)}건`,
      href: `/t/${tenantSlug}/admin/store/guest-orders`,
    },
    {
      title: "매출 조회",
      description: "게스트 주문 확정 매출을 확인합니다.",
      metricLabel: "최근 12개월 매출",
      metricValue: formatCurrency(overview.guestOrderRevenueKrw),
      href: `/t/${tenantSlug}/admin/store/guest-orders/revenue`,
    },
  ];

  return (
    <AdminPageShell title="관리 홈" description="코치 업무 메뉴와 오늘 확인할 운영 요약을 한눈에 봅니다.">
      <div className="space-y-6">
        <div className="border-y border-zinc-200">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-6 border-b border-zinc-200 px-1 py-3 text-xs font-medium text-zinc-500 md:grid">
            <span>메뉴</span>
            <span>요약</span>
            <span className="pr-1 text-right">이동</span>
          </div>

          <div className="divide-y divide-zinc-200">
            {items.map((item) => (
              <div
                key={item.title}
                className="grid gap-3 px-1 py-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center md:gap-6"
              >
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-950">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{item.description}</p>
                </div>

                <div className="flex items-baseline justify-between gap-4 md:block">
                  <p className="text-xs font-medium text-zinc-500">{item.metricLabel}</p>
                  <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">{item.metricValue}</p>
                </div>

                <Link
                  href={item.href}
                  className="inline-flex w-fit items-center gap-1 text-sm font-medium text-zinc-600 transition hover:text-zinc-950 md:justify-self-end"
                >
                  바로 보기
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 border-t border-zinc-200 pt-5 text-sm text-zinc-600 md:grid-cols-3">
          <div>
            <p className="font-medium text-zinc-950">활성 회원</p>
            <p className="mt-1">{formatCount(overview.activeProgramMemberCount)}명</p>
          </div>
          <div>
            <p className="font-medium text-zinc-950">전체 프로그램 리뷰</p>
            <p className="mt-1">{formatCount(overview.sessionReviewCount)}건</p>
          </div>
          <div>
            <p className="font-medium text-zinc-950">확정 주문</p>
            <p className="mt-1">최근 12개월 {formatCount(overview.confirmedGuestOrderCount)}건</p>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
