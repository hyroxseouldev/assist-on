import Link from "next/link";

import { CalendarClock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TenantBookingPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,rgba(187,247,208,0.9),transparent_34%),linear-gradient(135deg,#ffffff_0%,#f7f7f3_48%,#eef4ff_100%)] px-6 py-8 shadow-lg shadow-zinc-900/5 sm:px-10 sm:py-12">
        <div className="space-y-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-800">
            <CalendarClock className="size-3.5" />
            Booking Entry
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">예약 서비스 유저 페이지 준비 중</h1>
            <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
              테넌트 유저 플로우는 먼저 정리했고, 이 경로는 실제 예약 서비스 페이지가 들어올 자리를 선점해 두었습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/t/${tenantSlug}`}>
                테넌트 랜딩으로 돌아가기
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/store/${tenantSlug}`}>스토어 먼저 보기</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-900/5">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-950">현재 상태</CardTitle>
            <CardDescription>유저 예약 진입 경로를 먼저 오픈했습니다.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-zinc-700">테넌트 랜딩에서 예약 서비스로 이동할 수 있고, 이후 실제 예약 상세 화면을 붙일 예정입니다.</CardContent>
        </Card>

        <Card className="border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-900/5">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-950">다음 구현</CardTitle>
            <CardDescription>서비스 목록, 옵션, 가능한 슬롯 노출</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-zinc-700">예약 서비스 유저 페이지를 만들 때 이 라우트 아래에서 상세 탐색과 신청 흐름을 이어가면 됩니다.</CardContent>
        </Card>

        <Card className="border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-900/5">
          <CardHeader>
            <CardTitle className="text-lg text-zinc-950">같은 브랜드 경험</CardTitle>
            <CardDescription>테넌트 헤더와 푸터를 그대로 공유합니다.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-zinc-700">스토어와 예약 서비스가 같은 테넌트 문맥 안에서 보이도록 셸을 먼저 정리했습니다.</CardContent>
        </Card>
      </section>
    </main>
  );
}
