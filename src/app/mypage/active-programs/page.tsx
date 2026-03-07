import Link from "next/link";
import { redirect } from "next/navigation";

import { PublicHeader } from "@/components/navigation/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMyProgramAccesses, type MyProgramAccessItem } from "@/lib/subscriptions/server";

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

export default async function MyActiveProgramsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/mypage/active-programs")}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle<{ account_status: "active" | "deactivated" | null }>();

  if (profile?.account_status === "deactivated") {
    await supabase.auth.signOut();
    redirect("/login?error=deactivated");
  }

  const items = await getMyProgramAccesses(user.id);

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <section className="mb-5 space-y-1">
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
