import Link from "next/link";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminUser } from "@/lib/admin/server";

function formatCount(value: number | null) {
  return new Intl.NumberFormat("ko-KR").format(value ?? 0);
}

export default async function TenantAdminHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const { supabase, tenant } = await requireAdminUser();

  const [programsRes, membersRes, postsRes, reportsRes, recordsRes, ordersRes] = await Promise.all([
    supabase.from("programs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase.from("tenant_memberships").select("user_id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase
      .from("community_post_reports")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .eq("status", "open"),
    supabase.from("user_workout_records_v2").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase.from("program_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
  ]);

  const stats = [
    { label: "프로그램", value: programsRes.count ?? 0, href: `/t/${tenantSlug}/admin/program` },
    { label: "테넌트 멤버", value: membersRes.count ?? 0, href: `/t/${tenantSlug}/admin/all-users` },
    { label: "커뮤니티 게시글", value: postsRes.count ?? 0, href: `/t/${tenantSlug}/admin/community` },
    { label: "미처리 신고", value: reportsRes.count ?? 0, href: `/t/${tenantSlug}/admin/report` },
    { label: "운동 기록", value: recordsRes.count ?? 0, href: `/t/${tenantSlug}/admin/workout-records` },
    { label: "스토어 주문", value: ordersRes.count ?? 0, href: `/t/${tenantSlug}/admin/store/orders` },
  ];

  const quickLinks = [
    { label: "공지사항 관리", href: `/t/${tenantSlug}/admin/notices` },
    { label: "세션 캘린더", href: `/t/${tenantSlug}/admin/sessions` },
    { label: "커뮤니티 게시글", href: `/t/${tenantSlug}/admin/community` },
    { label: "커뮤니티 신고", href: `/t/${tenantSlug}/admin/report` },
    { label: "운동 레코드 리더보드", href: `/t/${tenantSlug}/admin/workout-records` },
    { label: "전체 유저 조회", href: `/t/${tenantSlug}/admin/all-users` },
    { label: "브랜딩", href: `/t/${tenantSlug}/admin/branding` },
    { label: "스토어 상품", href: `/t/${tenantSlug}/admin/store/products` },
  ];

  return (
    <AdminPageShell title="관리 홈" description="운영 상태를 빠르게 확인하고 주요 메뉴로 이동하세요.">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((item) => (
            <Link key={item.label} href={item.href} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-zinc-300 hover:bg-zinc-100">
              <p className="text-xs font-medium text-zinc-500">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">{formatCount(item.value)}</p>
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
