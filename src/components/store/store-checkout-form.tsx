"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createBankTransferOrderAction } from "@/lib/store/actions";
import type { StoreBankAccount } from "@/lib/store/server";

type StoreCheckoutFormProps = {
  tenantSlug: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productThumbnailUrl: string;
  productSaleType: "one_time" | "subscription";
  userEmail: string;
  initialBuyerName: string;
  bankAccount: StoreBankAccount;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/[^0-9]/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function StoreCheckoutForm({
  tenantSlug,
  productId,
  productTitle,
  productPrice,
  productThumbnailUrl,
  productSaleType,
  userEmail,
  initialBuyerName,
  bankAccount,
}: StoreCheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [buyerName, setBuyerName] = useState(initialBuyerName);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [depositorName, setDepositorName] = useState(initialBuyerName);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const hasBankAccount = useMemo(
    () =>
      Boolean(
        bankAccount.bank_name.trim() && bankAccount.bank_account_number.trim() && bankAccount.bank_account_holder.trim()
      ),
    [bankAccount.bank_account_holder, bankAccount.bank_account_number, bankAccount.bank_name]
  );
  const canSubmit = paymentMethod === "bank_transfer" && hasBankAccount && productSaleType === "one_time";

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    startTransition(async () => {
      const result = await createBankTransferOrderAction({
        tenantSlug,
        productId,
        buyerName,
        buyerPhone,
        depositorName,
      });

      if (!result.ok) {
        if (result.loginPath) {
          router.push(result.loginPath);
          return;
        }

        toast.error(result.message ?? "주문 접수에 실패했습니다.");
        return;
      }

      if (!result.payload?.orderId) {
        toast.error("주문 번호를 확인할 수 없습니다.");
        return;
      }

      router.push(
        `/store/${tenantSlug}/checkout/success?flow=bank-transfer&orderId=${encodeURIComponent(result.payload.orderId)}&productId=${encodeURIComponent(productId)}`
      );
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Card className="border-zinc-200/80">
          <CardHeader>
            <CardTitle>구매 정보</CardTitle>
            <CardDescription>입금 확인 후 프로그램 접근 권한이 활성화됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
              <div className="relative size-20 overflow-hidden rounded-xl bg-zinc-100">
                <Image src={productThumbnailUrl} alt={`${productTitle} 썸네일`} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Program</p>
                <p className="text-base font-semibold text-zinc-900">{productTitle}</p>
                <p className="text-sm text-zinc-600">
                  {formatCurrency(productPrice)}원{productSaleType === "subscription" ? " / 월" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80">
          <CardHeader>
            <CardTitle>구매자 정보</CardTitle>
            <CardDescription>입금 확인과 주문 안내에 사용할 정보를 입력해 주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyerEmail">계정 이메일</Label>
              <Input id="buyerEmail" value={userEmail} disabled readOnly />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerName">이름</Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(event) => setBuyerName(event.target.value)}
                placeholder="이름을 입력해 주세요"
                maxLength={40}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="buyerPhone">전화번호</Label>
              <Input
                id="buyerPhone"
                value={buyerPhone}
                onChange={(event) => setBuyerPhone(formatPhoneNumber(event.target.value))}
                placeholder="010-1234-5678"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="depositorName">입금자명</Label>
              <Input
                id="depositorName"
                value={depositorName}
                onChange={(event) => setDepositorName(event.target.value)}
                placeholder="실제 입금자명을 입력해 주세요"
                maxLength={40}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80">
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
            <CardDescription>현재는 무통장 결제만 이용할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300">
                <RadioGroupItem value="bank_transfer" id="payment-bank-transfer" className="mt-1" />
                <div className="space-y-1">
                  <p className="font-medium text-zinc-900">무통장 결제</p>
                  <p className="text-sm text-zinc-600">주문 접수 후 계좌 입금, 관리자 확인 후 활성화</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 opacity-60">
                <RadioGroupItem value="toss_pay" id="payment-toss-pay" className="mt-1" disabled />
                <div className="space-y-1">
                  <p className="font-medium text-zinc-900">토스페이</p>
                  <p className="text-sm text-zinc-600">준비 중입니다.</p>
                </div>
              </label>
            </RadioGroup>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
              <p className="font-semibold">입금 계좌 정보</p>
              {hasBankAccount ? (
                <div className="mt-3 space-y-1.5 text-sm text-amber-900">
                  <p>
                    <span className="text-amber-700">은행명</span> {bankAccount.bank_name}
                  </p>
                  <p>
                    <span className="text-amber-700">계좌번호</span> {bankAccount.bank_account_number}
                  </p>
                  <p>
                    <span className="text-amber-700">예금주</span> {bankAccount.bank_account_holder}
                  </p>
                  {bankAccount.bank_deposit_guide ? <p className="pt-2 leading-6">{bankAccount.bank_deposit_guide}</p> : null}
                </div>
              ) : (
                <p className="mt-3 leading-6">아직 입금 계좌 정보가 등록되지 않았습니다. 관리자에게 문의해 주세요.</p>
              )}
            </div>

            {productSaleType === "subscription" ? (
              <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
                구독 상품은 현재 무통장 결제를 지원하지 않습니다. 토스 구독 결제 오픈 후 이용할 수 있습니다.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="border-zinc-200/80 bg-white/95">
          <CardHeader className="space-y-2">
            <CardTitle>최종 결제 금액</CardTitle>
            <CardDescription>입금자명과 전화번호를 꼭 확인해 주세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm text-zinc-600">
              <span>상품 금액</span>
              <span>{formatCurrency(productPrice)}원</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-base font-semibold text-zinc-900">
              <span>총 결제 금액</span>
              <span>{formatCurrency(productPrice)}원</span>
            </div>
            <Button className="h-14 w-full rounded-xl text-base" disabled={!canSubmit || isPending} onClick={handleSubmit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "주문 접수 중..." : `${formatCurrency(productPrice)}원 주문 접수하기`}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
