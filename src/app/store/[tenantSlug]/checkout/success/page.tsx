import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CopyBankAccountButton } from "@/components/store/copy-bank-account-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationPassLabel } from "@/lib/store/duration-options";
import { getStoreCheckoutOrderSummary } from "@/lib/store/server";
import { confirmTossPayment, confirmTossSubscriptionStart } from "@/lib/store/toss";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>;
}

function SectionCard({ children }: { children: ReactNode }) {
  return <Card className="border-none shadow-none">{children}</Card>;
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">{children}</div>;
}

function FallbackSuccessState({
  title,
  description,
  primaryHref,
  primaryLabel,
}: {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
}) {
  return (
    <PageShell>
      <div className="space-y-6">
        <SectionCard>
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium tracking-[0.14em] text-zinc-600 uppercase">
              Checkout Status
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">{title}</CardTitle>
              <CardDescription className="text-sm leading-6 text-zinc-600">{description}</CardDescription>
            </div>
          </CardHeader>
        </SectionCard>

        <SectionCard>
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
            <CardDescription>아래 경로에서 다시 결제를 진행하거나 스토어로 이동할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Actions>
              <Button asChild className="h-11 px-5">
                <Link href={primaryHref}>{primaryLabel}</Link>
              </Button>
            </Actions>
          </CardContent>
        </SectionCard>
      </div>
    </PageShell>
  );
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
    duration?: string;
  }>;
}) {
  const { tenantSlug } = await params;
  const { flow, paymentKey, orderId, amount, authKey, customerKey, productId, duration } = await searchParams;

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
        <FallbackSuccessState
          title="주문 정보를 확인할 수 없습니다."
          description="주문 정보가 누락되어 결제 접수 결과를 표시할 수 없습니다. 다시 주문을 진행해 주세요."
          primaryHref={`/store/${tenantSlug}`}
          primaryLabel="스토어로 이동"
        />
      );
    }

    const order = await getStoreCheckoutOrderSummary({
      tenantSlug,
      providerOrderId: orderId,
      userId: user.id,
    });

    if (!order) {
      return (
        <FallbackSuccessState
          title="주문 정보를 찾을 수 없습니다."
          description="주문 내역을 아직 불러오지 못했습니다. 잠시 후 다시 확인해 주세요."
          primaryHref={productId ? `/store/${tenantSlug}/${productId}/checkout${duration ? `?duration=${duration}` : ""}` : `/store/${tenantSlug}`}
          primaryLabel={productId ? "결제 페이지로 돌아가기" : "스토어로 이동"}
        />
      );
    }

    return (
      <PageShell>
        <div className="space-y-6">
          <SectionCard>
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium tracking-[0.14em] text-zinc-600 uppercase">
                Order Received
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">주문이 접수되었습니다.</CardTitle>
                <CardDescription className="text-sm leading-6 text-zinc-600">
                  아래 계좌로 입금해 주시면 확인 후 프로그램 접근 권한이 활성화됩니다.
                </CardDescription>
              </div>
            </CardHeader>
          </SectionCard>

          <SectionCard>
            <CardHeader>
              <CardTitle>주문 요약</CardTitle>
              <CardDescription>입금 전 주문 정보와 입금자명을 다시 확인해 주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-700">
                <p className="text-base font-semibold text-zinc-900">{order.product?.program?.title ?? "프로그램"}</p>
                {order.duration_months ? <p className="mt-1 text-zinc-500">{formatDurationPassLabel(order.duration_months)}</p> : null}
                <div className="mt-4 space-y-2 leading-6">
                  <p>주문번호: {order.provider_order_id}</p>
                  <p>결제금액: {formatCurrency(order.amount_krw)}원</p>
                  <p>입금자명: {order.depositor_name || "-"}</p>
                </div>
              </div>
            </CardContent>
          </SectionCard>

          <SectionCard>
            <CardHeader>
              <CardTitle>입금 계좌 정보</CardTitle>
              <CardDescription>입금 확인은 보통 12시간 이내 처리됩니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-950">
                <p>
                  <span className="font-semibold text-amber-900">은행명</span> {order.bank_account.bank_name || "-"}
                </p>
                <p>
                  <span className="font-semibold text-amber-900">계좌번호</span> {order.bank_account.bank_account_number || "-"}
                  {order.bank_account.bank_account_number ? (
                    <span className="ml-2 inline-flex align-middle">
                      <CopyBankAccountButton accountNumber={order.bank_account.bank_account_number} />
                    </span>
                  ) : null}
                </p>
                <p>
                  <span className="font-semibold text-amber-900">예금주</span> {order.bank_account.bank_account_holder || "-"}
                </p>
                {order.bank_account.bank_deposit_guide ? <p className="pt-2">{order.bank_account.bank_deposit_guide}</p> : null}
              </div>
            </CardContent>
          </SectionCard>

          <SectionCard>
            <CardHeader>
              <CardTitle>다음 단계</CardTitle>
              <CardDescription>주문 상태는 구매 내역에서 계속 확인할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Actions>
                <Button asChild className="h-11 px-5">
                  <Link href="/mypage/orders">구매 내역 보기</Link>
                </Button>
                {productId ? (
                  <Button asChild variant="outline" className="h-11 px-5">
                    <Link href={`/store/${tenantSlug}/${productId}/checkout${duration ? `?duration=${duration}` : ""}`}>결제 페이지로 돌아가기</Link>
                  </Button>
                ) : null}
                <Button asChild variant="outline" className="h-11 px-5">
                  <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
                </Button>
              </Actions>
            </CardContent>
          </SectionCard>
        </div>
      </PageShell>
    );
  }

  if (flow === "subscription") {
    if (!orderId || !authKey || !customerKey) {
      return (
        <FallbackSuccessState
          title="결제 정보를 확인할 수 없습니다."
          description="구독 시작에 필요한 결제 정보가 누락되었습니다. 다시 결제를 시도해 주세요."
          primaryHref={`/store/${tenantSlug}`}
          primaryLabel="스토어로 이동"
        />
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
      <PageShell>
        <div className="space-y-6">
          <SectionCard>
            <CardHeader className="space-y-3">
              <div className="inline-flex w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium tracking-[0.14em] text-zinc-600 uppercase">
                Subscription Result
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">
                  {result.ok ? "구독이 시작되었습니다." : "구독 시작에 실패했습니다."}
                </CardTitle>
                <CardDescription className="text-sm leading-6 text-zinc-600">{result.message}</CardDescription>
              </div>
            </CardHeader>
          </SectionCard>

          <SectionCard>
            <CardHeader>
              <CardTitle>다음 단계</CardTitle>
              <CardDescription>스토어 또는 내 구독에서 현재 상태를 확인할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Actions>
                <Button asChild className="h-11 px-5">
                  <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
                </Button>
                {result.ok ? (
                  <Button asChild variant="outline" className="h-11 px-5">
                    <Link href="/mypage/subscriptions">내 구독으로 이동</Link>
                  </Button>
                ) : null}
              </Actions>
            </CardContent>
          </SectionCard>
        </div>
      </PageShell>
    );
  }

  if (!paymentKey || !orderId || !amount) {
    return (
      <FallbackSuccessState
        title="결제 정보를 확인할 수 없습니다."
        description="결제 확인에 필요한 정보가 누락되었습니다. 다시 결제를 시도해 주세요."
        primaryHref={`/store/${tenantSlug}`}
        primaryLabel="스토어로 이동"
      />
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
    <PageShell>
      <div className="space-y-6">
        <SectionCard>
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium tracking-[0.14em] text-zinc-600 uppercase">
              Payment Result
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">
                {result.ok ? "결제가 완료되었습니다." : "결제 확인에 실패했습니다."}
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-zinc-600">{result.message}</CardDescription>
            </div>
          </CardHeader>
        </SectionCard>

        <SectionCard>
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
            <CardDescription>구매 내역 또는 스토어에서 이후 진행 상태를 확인해 주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Actions>
              {result.ok ? (
                <Button asChild className="h-11 px-5">
                  <Link href="/mypage/orders">구매 내역 보기</Link>
                </Button>
              ) : null}
              <Button asChild variant={result.ok ? "outline" : "default"} className="h-11 px-5">
                <Link href={`/store/${tenantSlug}`}>스토어로 이동</Link>
              </Button>
            </Actions>
          </CardContent>
        </SectionCard>
      </div>
    </PageShell>
  );
}
