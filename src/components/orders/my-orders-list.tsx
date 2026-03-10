import Link from "next/link";

import { CopyBankAccountButton } from "@/components/store/copy-bank-account-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyOrderListItem } from "@/lib/store/server";
import { formatDurationPassLabel } from "@/lib/store/duration-options";

type MyOrdersListProps = {
  items: MyOrderListItem[];
  emptyTitle?: string;
  emptyDescription?: string;
};

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

function toStatusMeta(status: MyOrderListItem["status"]) {
  if (status === "paid") {
    return { label: "결제 완료", variant: "default" as const, description: "결제가 완료되었고 이용 권한이 반영되었거나 반영될 예정입니다." };
  }
  if (status === "failed") {
    return { label: "결제 실패", variant: "destructive" as const, description: "결제 처리 중 문제가 발생했습니다. 다시 결제를 시도해 주세요." };
  }
  if (status === "canceled") {
    return { label: "취소됨", variant: "outline" as const, description: "취소된 주문입니다." };
  }
  return { label: "확인 중", variant: "secondary" as const, description: "주문 또는 입금 확인이 진행 중입니다." };
}

function toPaymentMethodLabel(method: MyOrderListItem["payment_method"]) {
  if (method === "bank_transfer") return "무통장입금";
  if (method === "toss_card") return "카드결제";
  if (method === "toss_subscription") return "정기결제";
  return "결제수단 미정";
}

export function MyOrdersList({
  items,
  emptyTitle = "주문 내역이 없습니다",
  emptyDescription = "스토어에서 상품을 구매하면 여기에서 결제 상태와 주문 정보를 다시 확인할 수 있습니다.",
}: MyOrdersListProps) {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
          <CardDescription>{emptyDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="h-10 px-4">
            <Link href="/store">스토어 둘러보기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const status = toStatusMeta(item.status);
        const tenant = item.product?.tenant;
        const program = item.product?.program;
        const bankAccount = item.bank_account;
        const storeHref = tenant ? `/store/${tenant.slug}` : "/store";
        const checkoutHref = tenant && item.product ? `/store/${tenant.slug}/${item.product.id}/checkout` : null;
        const showBankAccount = item.payment_method === "bank_transfer" && item.status !== "paid" && bankAccount;

        return (
          <Card key={item.id} className="border-zinc-200/80 bg-white/95">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Badge variant="outline">{toPaymentMethodLabel(item.payment_method)}</Badge>
                {item.duration_months ? <Badge variant="outline">{formatDurationPassLabel(item.duration_months)}</Badge> : null}
              </div>
              <CardTitle className="text-lg">{program?.title ?? "프로그램"}</CardTitle>
              <CardDescription>
                {tenant ? (
                  <span>
                    {tenant.name} <span className="text-zinc-400">/{tenant.slug}</span>
                  </span>
                ) : (
                  status.description
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <p className="text-zinc-600">주문번호: {item.provider_order_id}</p>
                <p className="text-zinc-600">주문일: {formatDateTime(item.created_at)}</p>
                <p className="text-zinc-600">결제금액: {formatCurrency(item.amount_krw)}원</p>
                <p className="text-zinc-600">결제완료일: {formatDateTime(item.paid_at)}</p>
                <p className="text-zinc-600">구매자명: {item.buyer_name || "-"}</p>
                <p className="text-zinc-600">입금자명: {item.depositor_name || "-"}</p>
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
                  <Link href={`/mypage/orders/${item.id}`}>주문 상세</Link>
                </Button>
                <Button asChild variant="outline" className="h-10 px-4">
                  <Link href="/mypage/active-programs">내 활성 프로그램</Link>
                </Button>
                <Button asChild variant="outline" className="h-10 px-4">
                  <Link href={storeHref}>스토어</Link>
                </Button>
                {item.payment_method === "toss_subscription" ? (
                  <Button asChild variant="ghost" className="h-10 px-4">
                    <Link href="/mypage/subscriptions">구독 관리</Link>
                  </Button>
                ) : checkoutHref && item.status !== "paid" ? (
                  <Button asChild variant="ghost" className="h-10 px-4">
                    <Link href={checkoutHref}>다시 결제하기</Link>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
