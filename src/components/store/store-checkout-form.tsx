"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CopyBankAccountButton } from "@/components/store/copy-bank-account-button";
import { formatDurationPassLabel } from "@/lib/store/duration-options";
import { getTenantStoreCheckoutSuccessPath } from "@/lib/store/paths";
import { createBankTransferOrderAction } from "@/lib/store/actions";
import type { StoreBankAccount } from "@/lib/store/server";
import { cn } from "@/lib/utils";

type StoreCheckoutFormProps = {
  tenantSlug: string;
  productId: string;
  productTitle: string;
  productPrice: number;
  productThumbnailUrl: string;
  productSaleType: "one_time" | "subscription";
  durationMonths: 1 | 2 | 3 | 6 | null;
  userEmail: string;
  initialBuyerName: string;
  bankAccount: StoreBankAccount;
  legalContent: {
    electronicCommerceTitle: string;
    electronicCommerceHtml: string;
    privacyTitle: string;
    privacyHtml: string;
  };
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
  durationMonths,
  userEmail,
  initialBuyerName,
  bankAccount,
  legalContent,
}: StoreCheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [buyerName, setBuyerName] = useState(initialBuyerName);
  const [buyerPhone, setBuyerPhone] = useState("");
  const [depositorName, setDepositorName] = useState(initialBuyerName);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [openLegalModal, setOpenLegalModal] = useState<null | "electronicCommerce" | "privacy">(null);

  const hasBankAccount = useMemo(
    () =>
      Boolean(
        bankAccount.bank_name.trim() && bankAccount.bank_account_number.trim() && bankAccount.bank_account_holder.trim()
      ),
    [bankAccount.bank_account_holder, bankAccount.bank_account_number, bankAccount.bank_name]
  );
  const canSubmit = paymentMethod === "bank_transfer" && hasBankAccount && productSaleType === "one_time" && isConsentChecked;

  const modalTitle =
    openLegalModal === "electronicCommerce" ? legalContent.electronicCommerceTitle : legalContent.privacyTitle;
  const modalHtml =
    openLegalModal === "electronicCommerce" ? legalContent.electronicCommerceHtml : legalContent.privacyHtml;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    startTransition(async () => {
      const result = await createBankTransferOrderAction({
        tenantSlug,
        productId,
        durationMonths: durationMonths ?? 1,
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
        `${getTenantStoreCheckoutSuccessPath(tenantSlug)}?flow=bank-transfer&orderId=${encodeURIComponent(result.payload.orderId)}&productId=${encodeURIComponent(productId)}${durationMonths ? `&duration=${durationMonths}` : ""}`
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>프로그램</CardTitle>
            <CardDescription>입금 확인 후 프로그램 접근 권한이 활성화됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-2xl p-4">
              <div className="relative size-20 overflow-hidden rounded-xl bg-zinc-100">
                <Image src={productThumbnailUrl} alt={`${productTitle} 썸네일`} fill className="object-cover" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-base font-semibold text-zinc-900">{productTitle}</p>
                {durationMonths ? <p className="text-sm text-zinc-500">{formatDurationPassLabel(durationMonths)}</p> : null}
                <p className="text-xl font-bold">
                  {formatCurrency(productPrice)}원{productSaleType === "subscription" ? " / 월" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-none">
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

            <div className="rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="checkout-consent"
                  checked={isConsentChecked}
                  onCheckedChange={(checked) => setIsConsentChecked(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1.5 text-sm leading-6 text-zinc-700">
                  <label htmlFor="checkout-consent" className="font-medium text-zinc-900">
                    <span
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
                      onClick={(event) => {
                        event.preventDefault();
                        setOpenLegalModal("electronicCommerce");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenLegalModal("electronicCommerce");
                        }
                      }}
                    >
                      전자상거래 이용약관
                    </span>{" "}
                    및{" "}
                    <span
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
                      onClick={(event) => {
                        event.preventDefault();
                        setOpenLegalModal("privacy");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenLegalModal("privacy");
                        }
                      }}
                    >
                      개인정보처리방침
                    </span>
                    에 동의합니다.
                  </label>
                  <p>주문 접수 및 구매 처리에 필요한 범위 내에서 개인정보가 활용됩니다.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>결제 수단</CardTitle>
            <CardDescription>현재는 무통장 결제만 이용할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex flex-wrap gap-3">
              <label
                htmlFor="payment-bank-transfer"
                className={cn(
                  "relative flex w-[100px] shrink-0 aspect-[3/2] cursor-pointer flex-col justify-between rounded-2xl border p-3 transition-all",
                  paymentMethod === "bank_transfer"
                    ? "border-[2.5px] border-zinc-900 bg-white text-zinc-900 shadow-sm"
                    : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                )}
              >
                <RadioGroupItem value="bank_transfer" id="payment-bank-transfer" className="sr-only" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">무통장</p>
                  <p className="text-[11px] leading-4 text-zinc-500">계좌 입금 확인</p>
                </div>
              </label>

              <label
                htmlFor="payment-toss-pay"
                className="relative flex w-[100px] shrink-0 aspect-[3/2] cursor-not-allowed flex-col justify-between rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-3 opacity-70"
              >
                <RadioGroupItem value="toss_pay" id="payment-toss-pay" className="sr-only" disabled />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-900">토스페이</p>
                  <p className="text-[11px] leading-4 text-zinc-500">곧 지원</p>
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
                    <span className="ml-2 inline-flex align-middle">
                      <CopyBankAccountButton accountNumber={bankAccount.bank_account_number} />
                    </span>
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

        <Card className="border-none shadow-none">
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
            <Button className="h-14 w-full gap-2 rounded-xl text-base font-semibold" disabled={!canSubmit || isPending} onClick={handleSubmit}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isPending ? "주문 접수 중..." : `${formatCurrency(productPrice)}원 주문 접수하기`}
            </Button>
            {!isConsentChecked ? <p className="text-xs text-rose-600">주문 전 약관 동의가 필요합니다.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={openLegalModal !== null} onOpenChange={(open) => (!open ? setOpenLegalModal(null) : undefined)}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-zinc-200 px-6 py-5">
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>결제 전 내용을 확인해 주세요.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5">
            {modalHtml ? (
              <article
                className="prose prose-zinc max-w-none text-sm [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: modalHtml }}
              />
            ) : (
              <p className="text-sm text-zinc-500">게시된 문서를 찾을 수 없습니다.</p>
            )}
          </div>
          <DialogFooter className="border-t border-zinc-200 px-6 py-4 sm:justify-end">
            <Button type="button" onClick={() => setOpenLegalModal(null)}>
              내용 확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
