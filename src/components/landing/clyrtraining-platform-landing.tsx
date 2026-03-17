import Link from "next/link";

import { ArrowRight, Building2, CalendarClock, ShoppingBag, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PLATFORM_FEATURES = [
  {
    title: "테넌트 브랜딩 랜딩",
    description: "각 테넌트가 자기 브랜드로 유저 랜딩을 운영하고 스토어와 예약 동선을 직접 연결합니다.",
    icon: Building2,
  },
  {
    title: "스토어 판매 흐름",
    description: "프로그램 판매, 결제, 주문 확인까지 유저 구매 흐름을 단일 서비스 안에서 관리합니다.",
    icon: ShoppingBag,
  },
  {
    title: "예약 서비스 확장",
    description: "오프라인 클래스 이후 예약 서비스까지 한 테넌트 경험 안으로 자연스럽게 연결합니다.",
    icon: CalendarClock,
  },
] as const;

export function ClyrtrainingPlatformLanding() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:gap-10 lg:pt-14">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,rgba(201,255,225,0.9),transparent_34%),linear-gradient(135deg,#111827_0%,#1f2937_40%,#f5f7fb_100%)] px-6 py-8 text-white shadow-xl shadow-zinc-900/10 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-white/80">
              <Sparkles className="size-3.5" />
              Clyrtraining Platform
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                코치 운영과 유저 경험을 하나의 테넌트 흐름으로 묶는 트레이닝 플랫폼
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                Clyrtraining은 테넌트 랜딩, 스토어, 예약 서비스를 같은 브랜드 경험 안에서 연결해 유저 진입부터 구매와 예약까지 매끄럽게 이어 줍니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-zinc-950 hover:bg-zinc-100">
                <Link href="/tenant/login">
                  스토어 흐름 보기
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link href="/tenant/login">테넌트 로그인</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65">Root Role</p>
              <p className="mt-3 text-xl font-semibold">플랫폼 소개 랜딩</p>
              <p className="mt-2 text-sm leading-6 text-white/70">`/`는 이제 Clyrtraining 서비스 자체를 설명하는 입구로 사용합니다.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65">Tenant Role</p>
              <p className="mt-3 text-xl font-semibold">테넌트 유저 랜딩</p>
              <p className="mt-2 text-sm leading-6 text-white/70">각 테넌트는 전용 랜딩에서 스토어와 예약 서비스로 유저를 보냅니다.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.22em] text-white/65">Next Step</p>
              <p className="mt-3 text-xl font-semibold">예약 서비스 확장</p>
              <p className="mt-2 text-sm leading-6 text-white/70">유저 예약 화면을 붙이기 전, 현재 라우팅과 브랜드 진입 구조부터 정리합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PLATFORM_FEATURES.map((feature) => {
          const Icon = feature.icon;

          return (
            <Card key={feature.title} className="border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-900/5">
              <CardHeader className="space-y-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
                  <Icon className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg text-zinc-950">{feature.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm leading-6 text-zinc-600">{feature.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-zinc-200/80 bg-white/90 shadow-sm shadow-zinc-900/5">
          <CardHeader>
            <CardTitle className="text-zinc-950">이번 구조 변경의 핵심</CardTitle>
            <CardDescription>라우트 역할을 다시 나눠 플랫폼과 테넌트 경험을 분리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-zinc-700">
            <p>`/`는 플랫폼 소개 랜딩으로 사용합니다.</p>
            <p>`/t/[tenantSlug]`는 각 테넌트의 유저 랜딩으로 재정의합니다.</p>
            <p>유저는 랜딩에서 스토어와 예약 서비스로 바로 진입합니다.</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#eef6ff_100%)] shadow-sm shadow-zinc-900/5">
          <CardHeader>
            <CardTitle className="text-zinc-950">권장 유저 흐름</CardTitle>
            <CardDescription>지금 단계에서 가장 단순하고 확장 가능한 기본 동선입니다.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Step 01</p>
              <p className="mt-3 text-base font-semibold text-zinc-950">테넌트 랜딩 진입</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Step 02</p>
              <p className="mt-3 text-base font-semibold text-zinc-950">스토어 또는 예약 선택</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Step 03</p>
              <p className="mt-3 text-base font-semibold text-zinc-950">결제/로그인 후 액션 진행</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
