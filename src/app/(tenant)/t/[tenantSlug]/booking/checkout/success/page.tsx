import Link from "next/link";
import { redirect } from "next/navigation";

import { getTenantLoginPath } from "@/lib/auth/paths";
import { CopyBankAccountButton } from "@/components/store/copy-bank-account-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBookingReservationSummary } from "@/lib/booking/server";
import { getTenantBookingPath } from "@/lib/booking/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatSlotLabel(startsAt: string, endsAt: string) {
  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateFormatter.format(new Date(startsAt))} - ${timeFormatter.format(new Date(endsAt))}`;
}

export default async function TenantBookingCheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ reservationId?: string }>;
}) {
  const { tenantSlug } = await params;
  const { reservationId } = await searchParams;
  const bookingPath = getTenantBookingPath(tenantSlug);
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${getTenantLoginPath(tenantSlug)}?next=${encodeURIComponent(`${bookingPath}/checkout/success${reservationId ? `?reservationId=${reservationId}` : ""}`)}`);
  }

  if (!reservationId) {
    redirect(bookingPath);
  }

  const reservation = await getBookingReservationSummary({
    tenantSlug,
    reservationId,
    userId: user.id,
  });

  if (!reservation) {
    redirect(bookingPath);
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-6">
        <Card className="border-none shadow-none">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">
              Booking Received
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">예약 요청이 접수되었습니다.</CardTitle>
              <CardDescription className="text-sm leading-6 text-zinc-600">
                동일 슬롯에 여러 요청이 접수될 수 있으며, 관리자가 먼저 접수된 순서대로 확인 후 확정합니다.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>예약 요약</CardTitle>
            <CardDescription>예약 시간과 접수 정보를 다시 확인해 주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl bg-zinc-50 p-5 text-sm text-zinc-700">
              <p className="text-base font-semibold text-zinc-900">{reservation.serviceName}</p>
              <p className="mt-1 text-zinc-600">{reservation.optionName}</p>
              <div className="mt-4 space-y-2 leading-6">
                <p>예약번호: {reservation.id}</p>
                <p>예약시간: {formatSlotLabel(reservation.slotStartsAt, reservation.slotEndsAt)}</p>
                <p>예약자명: {reservation.bookerName}</p>
                <p>전화번호: {reservation.bookerPhone}</p>
                <p>결제금액: {formatCurrency(reservation.priceKrw)}원</p>
                <p>현재상태: 접수 완료</p>
                {reservation.userMemo ? <p>메모: {reservation.userMemo}</p> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>입금 계좌 정보</CardTitle>
            <CardDescription>예약자명과 다른 이름으로 입금할 경우 메모에 남긴 이름을 기준으로 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-950">
              <p>
                <span className="font-semibold text-amber-900">은행명</span> {reservation.bankAccount.bankName || "-"}
              </p>
              <p>
                <span className="font-semibold text-amber-900">계좌번호</span> {reservation.bankAccount.bankAccountNumber || "-"}
                {reservation.bankAccount.bankAccountNumber ? (
                  <span className="ml-2 inline-flex align-middle">
                    <CopyBankAccountButton accountNumber={reservation.bankAccount.bankAccountNumber} />
                  </span>
                ) : null}
              </p>
              <p>
                <span className="font-semibold text-amber-900">예금주</span> {reservation.bankAccount.bankAccountHolder || "-"}
              </p>
              {reservation.bankAccount.bankDepositGuide ? <p className="pt-2">{reservation.bankAccount.bankDepositGuide}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
            <CardDescription>예약 확정은 관리자 확인 후 순차적으로 진행됩니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-11 px-5">
                <Link href={bookingPath}>예약 홈으로 이동</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5">
                <Link href={`/t/${tenantSlug}`}>테넌트 홈으로 이동</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
