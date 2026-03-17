import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CancelOrderButton } from "@/components/orders/cancel-order-button";
import { CopyBankAccountButton } from "@/components/store/copy-bank-account-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTenantStorePath } from "@/lib/store/paths";
import { formatDurationPassLabel } from "@/lib/store/duration-options";
import { getMyOrderDetail } from "@/lib/store/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

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

function getStatusMeta(status: string) {
  if (status === "paid") return { label: "결제 완료", variant: "default" as const };
  if (status === "failed") return { label: "결제 실패", variant: "destructive" as const };
  if (status === "canceled") return { label: "취소됨", variant: "outline" as const };
  return { label: "확인 중", variant: "secondary" as const };
}

function getPaymentMethodLabel(method: "bank_transfer" | "toss_card" | "toss_subscription" | null) {
  if (method === "bank_transfer") return "무통장입금";
  if (method === "toss_card") return "카드결제";
  if (method === "toss_subscription") return "정기결제";
  return "결제수단 미정";
}

export default async function MyPageOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/mypage/orders/${orderId}`)}`);
  }

  const order = await getMyOrderDetail({ userId: user.id, orderId });
  if (!order) {
    notFound();
  }

  const tenant = order.product?.tenant;
  const program = order.product?.program;
  const status = getStatusMeta(order.status);
  const bankAccount = order.bank_account;
  const showBankAccount = order.payment_method === "bank_transfer" && order.status !== "paid" && bankAccount;
  const canCancel = order.status === "pending";

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">주문 상세</h1>
        <p className="text-sm text-zinc-600">결제 상태와 주문 정보를 다시 확인합니다.</p>
      </section>

      <Card className="border-zinc-200/80 bg-white/95">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant="outline">{getPaymentMethodLabel(order.payment_method)}</Badge>
            {order.duration_months ? <Badge variant="outline">{formatDurationPassLabel(order.duration_months)}</Badge> : null}
          </div>
          <CardTitle className="text-lg">{program?.title ?? "프로그램"}</CardTitle>
          <CardDescription>
            {tenant ? `${tenant.name} /${tenant.slug}` : "테넌트 정보 없음"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5 text-sm">
          <div className="grid gap-2 md:grid-cols-2">
            <p className="text-zinc-600">주문번호: {order.provider_order_id}</p>
            <p className="text-zinc-600">주문일: {formatDateTime(order.created_at)}</p>
            <p className="text-zinc-600">결제금액: {formatCurrency(order.amount_krw)}원</p>
            <p className="text-zinc-600">결제완료일: {formatDateTime(order.paid_at)}</p>
            <p className="text-zinc-600">구매자명: {order.buyer_name || "-"}</p>
            <p className="text-zinc-600">입금자명: {order.depositor_name || "-"}</p>
            <p className="text-zinc-600">이메일: {order.buyer_email || "-"}</p>
            <p className="text-zinc-600">연락처: {order.buyer_phone || "-"}</p>
          </div>

          {showBankAccount && bankAccount ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <p className="font-semibold">입금 계좌 정보</p>
              <p className="mt-2">은행명: {bankAccount.bank_name || "-"}</p>
              <p>
                계좌번호: {bankAccount.bank_account_number || "-"}
                {bankAccount.bank_account_number ? (
                  <span className="ml-2 inline-flex align-middle">
                    <CopyBankAccountButton accountNumber={bankAccount.bank_account_number} />
                  </span>
                ) : null}
              </p>
              <p>예금주: {bankAccount.bank_account_holder || "-"}</p>
              {bankAccount.bank_deposit_guide ? <p className="mt-3">{bankAccount.bank_deposit_guide}</p> : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild variant="outline" className="h-10 px-4">
              <Link href="/mypage/orders">주문 내역</Link>
            </Button>
            {tenant ? (
              <Button asChild variant="outline" className="h-10 px-4">
                <Link href={getTenantStorePath(tenant.slug)}>스토어</Link>
              </Button>
            ) : null}
            {canCancel ? <CancelOrderButton orderId={order.id} orderLabel={order.provider_order_id} /> : null}
            <Button asChild variant="ghost" className="h-10 px-4">
              <Link href="/mypage/active-programs">내 활성 프로그램</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
