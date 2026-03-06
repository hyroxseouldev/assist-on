import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/navigation/public-header";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { confirmTossPayment, confirmTossSubscriptionStart } from "@/lib/store/toss";

export default async function PublicCheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{
    flow?: string;
    paymentKey?: string;
    orderId?: string;
    amount?: string;
    authKey?: string;
    customerKey?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const { flow, paymentKey, orderId, amount, authKey, customerKey } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/store/${tenantSlug}/checkout/success`)}`);
  }

  if (flow === "subscription") {
    if (!orderId || !authKey || !customerKey) {
      return (
        <>
          <PublicHeader />
          <main className="mx-auto w-full max-w-xl px-4 py-16">
            <Card>
              <CardHeader>
                <CardTitle>결제 정보를 확인할 수 없습니다.</CardTitle>
                <CardDescription>다시 결제를 시도해 주세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </>
      );
    }

    const result = await confirmTossSubscriptionStart({
      tenantSlug,
      orderId,
      authKey,
      customerKey,
      userId: user.id,
    });

    return (
      <>
        <PublicHeader />
        <main className="mx-auto w-full max-w-xl px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>{result.ok ? "구독이 시작되었습니다." : "구독 시작에 실패했습니다."}</CardTitle>
              <CardDescription>{result.message}</CardDescription>
            </CardHeader>
            <CardContent className="space-x-2">
              <Button asChild>
                <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
              </Button>
              {result.ok ? (
                <Button asChild variant="outline">
                  <Link href="/mypage/subscriptions">내 구독으로 이동</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  if (!paymentKey || !orderId || !amount) {
    return (
      <>
        <PublicHeader />
        <main className="mx-auto w-full max-w-xl px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>결제 정보를 확인할 수 없습니다.</CardTitle>
              <CardDescription>다시 결제를 시도해 주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  const result = await confirmTossPayment({
    tenantSlug,
    paymentKey,
    orderId,
    amount: Number(amount),
    userId: user.id,
  });

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>{result.ok ? "결제가 완료되었습니다." : "결제 확인에 실패했습니다."}</CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-x-2">
            <Button asChild>
              <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
            </Button>
            {result.ok ? (
              <Button asChild variant="outline">
                <Link href={`/t/${tenantSlug}`}>홈으로 이동</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
