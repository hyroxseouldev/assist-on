import Link from "next/link";
import { ArrowRight, BellDot, BookOpenText, ClipboardList, Dumbbell, Package, Users } from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireAdminUser } from "@/lib/admin/server";

function formatCount(value: number | null) {
  return new Intl.NumberFormat("ko-KR").format(value ?? 0);
}

type StatCard = {
  label: string;
  value: number;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  valueLabel: string;
  details: Array<{ label: string; value: number; tone?: "default" | "positive" | "warning" | "danger" }>;
};

function getDetailToneClass(tone: StatCard["details"][number]["tone"]) {
  if (tone === "positive" || tone === "warning" || tone === "danger") {
    return "border-zinc-200 bg-white text-zinc-600";
  }

  return "border-zinc-200 bg-white text-zinc-600";
}

export default async function TenantAdminHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, tenant } = await requireAdminUser(tenantSlug);

  const [
    programsRes,
    programProductsActiveRes,
    programProductsPreparingRes,
    programProductsPrivateRes,
    membershipsRes,
    membersOwnerRes,
    membersCoachRes,
    membersMemberRes,
    postsRes,
    postsPublishedRes,
    postsHiddenRes,
    postsDeletedRes,
    reportsOpenRes,
    reportsResolvedRes,
    reportsRejectedRes,
    recordsRes,
    recordsTimeRes,
    recordsWeightRes,
    workoutParticipantsRes,
    ordersRes,
    ordersPendingRes,
    ordersPaidRes,
    ordersCanceledRes,
    ordersFailedRes,
  ] = await Promise.all([
    supabase.from("programs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase
      .from("program_products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("sale_status", "active"),
    supabase
      .from("program_products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("sale_status", "preparing"),
    supabase
      .from("program_products")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("sale_status", "private"),
    supabase.from("tenant_memberships").select("user_id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase
      .from("tenant_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("role", "owner"),
    supabase
      .from("tenant_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("role", "coach"),
    supabase
      .from("tenant_memberships")
      .select("user_id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("role", "member"),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "published"),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "hidden"),
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "deleted"),
    supabase
      .from("community_post_reports")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "open"),
    supabase
      .from("community_post_reports")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "resolved"),
    supabase
      .from("community_post_reports")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "rejected"),
    supabase.from("user_workout_records_v2").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase
      .from("user_workout_records_v2")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("record_type", "time"),
    supabase
      .from("user_workout_records_v2")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("record_type", "weight"),
    supabase
      .from("user_workout_records_v2")
      .select("user_id")
      .eq("tenant_id", tenant.id)
      .returns<Array<{ user_id: string }>>(),
    supabase.from("program_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase
      .from("program_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "pending"),
    supabase
      .from("program_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "paid"),
    supabase
      .from("program_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "canceled"),
    supabase
      .from("program_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "failed"),
  ]);

  const workoutParticipantCount = new Set((workoutParticipantsRes.data ?? []).map((row) => row.user_id)).size;

  const stats: StatCard[] = [
    {
      label: "프로그램",
      value: programsRes.count ?? 0,
      valueLabel: "등록 프로그램",
      href: `/t/${tenantSlug}/admin/program`,
      icon: Package,
      details: [
        { label: "판매중", value: programProductsActiveRes.count ?? 0, tone: "positive" },
        { label: "준비중", value: programProductsPreparingRes.count ?? 0, tone: "warning" },
        { label: "비공개", value: programProductsPrivateRes.count ?? 0 },
      ],
    },
    {
      label: "테넌트 멤버",
      value: membershipsRes.count ?? 0,
      valueLabel: "전체 멤버",
      href: `/t/${tenantSlug}/admin/all-users`,
      icon: Users,
      details: [
        { label: "오너", value: membersOwnerRes.count ?? 0 },
        { label: "코치", value: membersCoachRes.count ?? 0, tone: "positive" },
        { label: "멤버", value: membersMemberRes.count ?? 0 },
      ],
    },
    {
      label: "커뮤니티",
      value: postsRes.count ?? 0,
      valueLabel: "전체 게시글",
      href: `/t/${tenantSlug}/admin/community`,
      icon: BookOpenText,
      details: [
        { label: "공개", value: postsPublishedRes.count ?? 0, tone: "positive" },
        { label: "숨김", value: postsHiddenRes.count ?? 0, tone: "warning" },
        { label: "삭제", value: postsDeletedRes.count ?? 0, tone: "danger" },
      ],
    },
    {
      label: "미처리 신고",
      value: reportsOpenRes.count ?? 0,
      valueLabel: "대기 신고",
      href: `/t/${tenantSlug}/admin/report`,
      icon: BellDot,
      details: [
        { label: "해결", value: reportsResolvedRes.count ?? 0, tone: "positive" },
        { label: "기각", value: reportsRejectedRes.count ?? 0 },
        { label: "전체", value: (reportsOpenRes.count ?? 0) + (reportsResolvedRes.count ?? 0) + (reportsRejectedRes.count ?? 0) },
      ],
    },
    {
      label: "운동 기록",
      value: recordsRes.count ?? 0,
      valueLabel: "누적 기록",
      href: `/t/${tenantSlug}/admin/workout-records`,
      icon: Dumbbell,
      details: [
        { label: "타임 기록", value: recordsTimeRes.count ?? 0, tone: "warning" },
        { label: "중량 기록", value: recordsWeightRes.count ?? 0 },
        { label: "참여 회원", value: workoutParticipantCount ?? 0, tone: "positive" },
      ],
    },
    {
      label: "주문",
      value: ordersRes.count ?? 0,
      valueLabel: "전체 주문",
      href: `/t/${tenantSlug}/admin/store/orders`,
      icon: ClipboardList,
      details: [
        { label: "입금 대기", value: ordersPendingRes.count ?? 0, tone: "warning" },
        { label: "입금 확인", value: ordersPaidRes.count ?? 0, tone: "positive" },
        { label: "취소/실패", value: (ordersCanceledRes.count ?? 0) + (ordersFailedRes.count ?? 0), tone: "danger" },
      ],
    },
  ];

  const quickLinks = [
    { label: "공지사항 관리", href: `/t/${tenantSlug}/admin/notices` },
    { label: "운동 입력", href: `/t/${tenantSlug}/admin/sessions` },
    { label: "커뮤니티", href: `/t/${tenantSlug}/admin/community` },
    { label: "신고", href: `/t/${tenantSlug}/admin/report` },
    { label: "리더보드", href: `/t/${tenantSlug}/admin/workout-records` },
    { label: "유저 정보 관리", href: `/t/${tenantSlug}/admin/all-users` },
    { label: "기본정보", href: `/t/${tenantSlug}/admin/branding` },
    { label: "스토어 상품", href: `/t/${tenantSlug}/admin/store/products` },
  ];

  return (
    <AdminPageShell title="관리 홈" description="운영 상태를 빠르게 확인하고 주요 메뉴로 이동하세요.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <Link key={item.label} href={item.href} className="group block">
              <Card className="h-full overflow-hidden border-zinc-200 bg-white py-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md">
                <CardContent className="p-0">
                  <div className="rounded-t-xl border-b border-zinc-100 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold tracking-[0.12em] text-zinc-600 uppercase">{item.label}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{formatCount(item.value)}</p>
                        <p className="mt-1 text-sm text-zinc-600">{item.valueLabel}</p>
                      </div>
                      <div className="flex size-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 shadow-sm">
                        <item.icon className="size-5" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {item.details.map((detail) => (
                        <div
                          key={detail.label}
                          className={cn("rounded-lg border px-3 py-2", getDetailToneClass(detail.tone))}
                        >
                          <p className="text-[11px] font-medium">{detail.label}</p>
                          <p className="mt-1 text-base font-semibold tracking-tight text-zinc-900">{formatCount(detail.value)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm font-medium text-zinc-500 transition group-hover:text-zinc-900">
                      <span>상세 운영 보기</span>
                      <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-base">빠른 이동</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 hover:text-zinc-900"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
