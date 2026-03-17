import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantBookingPath } from "@/lib/booking/paths";

export default async function TenantBookingCheckoutFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { tenantSlug } = await params;
  const { message } = await searchParams;
  const bookingPath = getTenantBookingPath(tenantSlug);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="space-y-6">
        <Card className="border-none shadow-none">
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-rose-700">
              Booking Failed
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">예약 접수를 완료하지 못했습니다.</CardTitle>
              <CardDescription className="text-sm leading-6 text-zinc-600">정보를 다시 확인한 뒤 다시 시도해 주세요.</CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>오류 상세</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-sm leading-6 text-rose-950">
              {message ?? "잠시 후 다시 시도해 주세요."}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
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
