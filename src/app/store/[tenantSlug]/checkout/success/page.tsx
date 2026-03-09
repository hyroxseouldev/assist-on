import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/navigation/public-header";
import { CopyBankAccountButton } from "@/components/store/copy-bank-account-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreCheckoutOrderSummary } from "@/lib/store/server";
import { confirmTossPayment, confirmTossSubscriptionStart } from "@/lib/store/toss";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

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
      productId?: string;
    }>;
}) {
  const { tenantSlug } = await params;
  const { flow, paymentKey, orderId, amount, authKey, customerKey, productId } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/store/${tenantSlug}/checkout/success`)}`);
  }

  if (flow === "bank-transfer") {
    if (!orderId) {
      return (
        <>
          <PublicHeader />
          <main className="mx-auto w-full max-w-xl px-4 py-16">
            <Card>
              <CardHeader>
                <CardTitle>주문 정보를 확인할 수 없습니다.</CardTitle>
                <CardDescription>다시 주문을 진행해 주세요.</CardDescription>
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

    const order = await getStoreCheckoutOrderSummary({
      tenantSlug,
      providerOrderId: orderId,
      userId: user.id,
    });

    if (!order) {
      return (
        <>
          <PublicHeader />
          <main className="mx-auto w-full max-w-xl px-4 py-16">
            <Card>
              <CardHeader>
                <CardTitle>주문 정보를 찾을 수 없습니다.</CardTitle>
                <CardDescription>잠시 후 다시 확인해 주세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={productId ? `/store/${tenantSlug}/${productId}/checkout` : `/store/${tenantSlug}`}>돌아가기</Link>
                </Button>
              </CardContent>
            </Card>
          </main>
        </>
      );
    }

    return (
      <>
        <PublicHeader />
        <main className="mx-auto w-full max-w-xl px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>주문이 접수되었습니다.</CardTitle>
              <CardDescription>아래 계좌로 입금해 주시면 확인 후 프로그램 접근 권한이 활성화됩니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                <p className="font-semibold text-zinc-900">{order.product?.program?.title ?? "프로그램"}</p>
                <p className="mt-1">주문번호: {order.provider_order_id}</p>
                <p>결제금액: {formatCurrency(order.amount_krw)}원</p>
                <p>입금자명: {order.depositor_name || "-"}</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                <p className="font-semibold">입금 계좌 정보</p>
                <p className="mt-2">은행명: {order.bank_account.bank_name || "-"}</p>
                <p>
                  계좌번호: {order.bank_account.bank_account_number || "-"}
                  {order.bank_account.bank_account_number ? (
                    <span className="ml-2 inline-flex align-middle">
                      <CopyBankAccountButton accountNumber={order.bank_account.bank_account_number} />
                    </span>
                  ) : null}
                </p>
                <p>예금주: {order.bank_account.bank_account_holder || "-"}</p>
                {order.bank_account.bank_deposit_guide ? <p className="mt-3">{order.bank_account.bank_deposit_guide}</p> : null}
                <p className="mt-3 font-medium">입금 확인은 보통 12시간 이내 처리됩니다.</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {productId ? (
                  <Button asChild variant="outline">
                    <Link href={`/store/${tenantSlug}/${productId}/checkout`}>결제 페이지로 돌아가기</Link>
                  </Button>
                ) : null}
                <Button asChild>
                  <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </>
    );
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
