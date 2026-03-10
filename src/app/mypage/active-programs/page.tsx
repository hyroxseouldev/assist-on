import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProgramAccesses, type MyProgramAccessItem } from "@/lib/subscriptions/server";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRemainingLabel(endsAt: string | null) {
  if (!endsAt) return "종료일 없음";
  const diffMs = Date.parse(endsAt) - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (Number.isNaN(diffDays)) return "확인 필요";
  if (diffDays < 0) return "이용 기간 종료";
  if (diffDays === 0) return "오늘 종료";
  return `${diffDays}일 남음`;
}

function getSubscriptionStatus(item: MyProgramAccessItem) {
  const status = item.subscription?.status;
  if (!status) {
    return { label: "구독 없음", variant: "outline" as const };
  }
  if (status === "active") {
    return { label: "구독 활성", variant: "default" as const };
  }
  if (status === "past_due") {
    return { label: "결제 확인 필요", variant: "destructive" as const };
  }
  if (status === "incomplete") {
    return { label: "구독 준비 중", variant: "secondary" as const };
  }
  return { label: "구독 해지", variant: "outline" as const };
}

function getEntitlementStatus(item: MyProgramAccessItem) {
  if (!item.entitlement.has_any) {
    return { label: "권한 없음", variant: "outline" as const };
  }
  if (item.entitlement.is_accessible_now) {
    return { label: "접근 가능", variant: "default" as const };
  }
  if (item.entitlement.is_active === false) {
    return { label: "권한 비활성", variant: "outline" as const };
  }
  return { label: "권한 만료", variant: "secondary" as const };
}

function getAccessSourceLabel(item: MyProgramAccessItem) {
  if (item.subscription) {
    return item.subscription.product?.billing_interval ? "구독 이용권" : "구독";
  }
  if (item.entitlement.has_any) {
    return "기간권/승인형 이용권";
  }
  return "구매 전";
}

export default async function MyActiveProgramsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mypage/active-programs")}`);
  }

  const items = await getMyProgramAccesses(user.id);

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">내 활성 프로그램</h1>
        <p className="text-sm text-zinc-600">구독/권한 상태를 모두 확인하고 프로그램으로 이동할 수 있습니다.</p>
      </section>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>표시할 프로그램이 없습니다</CardTitle>
            <CardDescription>구매 또는 초대 후 프로그램 권한이 생기면 여기에서 확인할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/store">스토어로 이동</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const tenant = item.tenant;
            const program = item.program;
            const subscriptionStatus = getSubscriptionStatus(item);
            const entitlementStatus = getEntitlementStatus(item);
            const tenantHomeHref = tenant ? `/t/${tenant.slug}` : null;
            const tenantStoreHref = tenant ? `/store/${tenant.slug}` : null;

            return (
              <Card
                key={
                  item.subscription?.id ??
                  `${tenant?.id ?? "tenant"}-${program?.id ?? "program"}-${item.entitlement.latest_starts_at ?? "none"}`
                }
                className="border-zinc-200/80 bg-white/95"
              >
                <CardHeader className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={subscriptionStatus.variant}>{subscriptionStatus.label}</Badge>
                    <Badge variant={entitlementStatus.variant}>{entitlementStatus.label}</Badge>
                    {item.subscription?.cancel_at_period_end ? <Badge variant="outline">해지 예약</Badge> : null}
                  </div>
                  <CardTitle className="text-lg">{program?.title ?? "프로그램"}</CardTitle>
                  <CardDescription>
                    {tenant ? (
                      <span>
                        {tenant.name} <span className="text-zinc-400">/{tenant.slug}</span>
                      </span>
                    ) : (
                      "테넌트 정보 없음"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <div className="grid w-full gap-2 text-sm text-zinc-600 md:grid-cols-2">
                    <p>이용 시작: {formatDateTime(item.entitlement.latest_starts_at ?? item.subscription?.current_period_start_at ?? null)}</p>
                    <p>이용 종료: {formatDateTime(item.entitlement.latest_ends_at ?? item.subscription?.current_period_end_at ?? null)}</p>
                    <p>남은 기간: {getRemainingLabel(item.entitlement.latest_ends_at ?? item.subscription?.current_period_end_at ?? null)}</p>
                    <p>이용 방식: {getAccessSourceLabel(item)}</p>
                  </div>

                  {tenantHomeHref ? (
                    <Button asChild variant="outline" className="h-10 px-4">
                      <Link href={tenantHomeHref}>프로그램 홈</Link>
                    </Button>
                  ) : null}
                  {tenantStoreHref ? (
                    <Button asChild variant="outline" className="h-10 px-4">
                      <Link href={tenantStoreHref}>스토어</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost" className="h-10 px-4">
                    <Link href="/mypage/subscriptions">구독 관리</Link>
                  </Button>
                  <Button asChild variant="ghost" className="h-10 px-4">
                    <Link href="/mypage/orders">구매 내역</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
