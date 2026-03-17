"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createBookingReservationAction } from "@/lib/booking/actions";
import { getTenantBookingCheckoutSuccessPath } from "@/lib/booking/paths";
import { cn } from "@/lib/utils";

type BookingCheckoutFormProps = {
  tenantSlug: string;
  serviceId: string;
  optionId: string;
  slotId: string;
  serviceName: string;
  optionName: string;
  optionDescription: string;
  priceKrw: number;
  userEmail: string;
  initialBookerName: string;
  slotLabel: string;
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

export function BookingCheckoutForm({
  tenantSlug,
  serviceId,
  optionId,
  slotId,
  serviceName,
  optionName,
  optionDescription,
  priceKrw,
  userEmail,
  initialBookerName,
  slotLabel,
  legalContent,
}: BookingCheckoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bookerName, setBookerName] = useState(initialBookerName);
  const [bookerPhone, setBookerPhone] = useState("");
  const [userMemo, setUserMemo] = useState("");
  const [isConsentChecked, setIsConsentChecked] = useState(false);
  const [openLegalModal, setOpenLegalModal] = useState<null | "electronicCommerce" | "privacy">(null);

  const modalTitle = openLegalModal === "electronicCommerce" ? legalContent.electronicCommerceTitle : legalContent.privacyTitle;
  const modalHtml = openLegalModal === "electronicCommerce" ? legalContent.electronicCommerceHtml : legalContent.privacyHtml;

  const handleSubmit = () => {
    if (!isConsentChecked) {
      return;
    }

    startTransition(async () => {
      const result = await createBookingReservationAction({
        tenantSlug,
        serviceId,
        optionId,
        slotId,
        bookerName,
        bookerPhone,
        userMemo,
      });

      if (!result.ok) {
        if (result.loginPath) {
          router.push(result.loginPath);
          return;
        }

        toast.error(result.message ?? "예약 접수에 실패했습니다.");
        return;
      }

      if (!result.payload?.reservationId) {
        toast.error("예약 번호를 확인할 수 없습니다.");
        return;
      }

      router.push(`${getTenantBookingCheckoutSuccessPath(tenantSlug)}?reservationId=${encodeURIComponent(result.payload.reservationId)}`);
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>예약 정보</CardTitle>
          <CardDescription>선택한 예약 옵션과 시간을 다시 확인해 주세요.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl bg-zinc-50 p-5">
            <p className="text-base font-semibold text-zinc-900">{serviceName}</p>
            <p className="mt-1 text-sm font-medium text-zinc-700">{optionName}</p>
            {optionDescription ? <p className="mt-2 text-sm leading-6 text-zinc-600">{optionDescription}</p> : null}
            <div className="mt-4 space-y-1 text-sm text-zinc-700">
              <p>예약 시간: {slotLabel}</p>
              <p className="text-base font-semibold text-zinc-950">결제 금액: {formatCurrency(priceKrw)}원</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>예약자 정보</CardTitle>
          <CardDescription>예약 확인 연락과 입금 안내에 사용할 정보입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bookerEmail">계정 이메일</Label>
            <Input id="bookerEmail" value={userEmail} disabled readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bookerName">예약자 이름</Label>
            <Input id="bookerName" value={bookerName} onChange={(event) => setBookerName(event.target.value)} placeholder="이름을 입력해 주세요" maxLength={40} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bookerPhone">전화번호</Label>
            <Input
              id="bookerPhone"
              value={bookerPhone}
              onChange={(event) => setBookerPhone(formatPhoneNumber(event.target.value))}
              placeholder="010-1234-5678"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userMemo">요청 메모</Label>
            <Textarea
              id="userMemo"
              value={userMemo}
              onChange={(event) => setUserMemo(event.target.value)}
              rows={4}
              placeholder="남기고 싶은 내용이 있으면 적어 주세요. 입금자명이 다를 예정이면 여기 적어 주세요."
              maxLength={400}
            />
          </div>

          <div className="rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <Checkbox id="checkout-consent" checked={isConsentChecked} onCheckedChange={(checked) => setIsConsentChecked(checked === true)} className="mt-0.5" />
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
                <p>예약 접수 및 확인에 필요한 범위 내에서 개인정보가 활용됩니다.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>결제 방식</CardTitle>
          <CardDescription>현재 예약은 무통장 입금 접수 후 관리자가 순서대로 확인합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold text-amber-900">안내</p>
            <p className="mt-2">동일 슬롯에 여러 요청이 접수될 수 있으며, 관리자가 먼저 접수된 순서대로 확정합니다.</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-700">
            <p className="font-semibold text-zinc-900">결제 수단</p>
            <p className="mt-1">무통장 입금</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none">
        <CardHeader className="space-y-2">
          <CardTitle>최종 접수 금액</CardTitle>
          <CardDescription>예약 접수 후 계좌 안내와 함께 최종 상태를 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>예약 금액</span>
            <span>{formatCurrency(priceKrw)}원</span>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-base font-semibold text-zinc-900">
            <span>총 결제 금액</span>
            <span>{formatCurrency(priceKrw)}원</span>
          </div>
          <Button className="h-14 w-full gap-2 rounded-xl text-base font-semibold" disabled={!isConsentChecked || isPending} onClick={handleSubmit}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isPending ? "예약 접수 중..." : `${formatCurrency(priceKrw)}원 예약 접수하기`}
          </Button>
          {!isConsentChecked ? <p className="text-xs text-rose-600">예약 전 약관 동의가 필요합니다.</p> : null}
        </CardContent>
      </Card>

      <Dialog open={openLegalModal !== null} onOpenChange={(open) => (!open ? setOpenLegalModal(null) : undefined)}>
        <DialogContent className="max-h-[85vh] overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-zinc-200 px-6 py-5">
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>예약 접수 전 내용을 확인해 주세요.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-5">
            {modalHtml ? (
              <article
                className={cn("prose prose-zinc max-w-none text-sm [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5")}
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
