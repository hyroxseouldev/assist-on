import Image from "next/image";
import Link from "next/link";

import { ArrowRight, CalendarClock, ShoppingBag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle, NonBorderCard } from "@/components/ui/card";
import type { TenantMarketingLandingData } from "@/lib/landing/server";
import { getTenantStorePath, getTenantStoreProductPath } from "@/lib/store/paths";
import { resolveTenantBrandName } from "@/lib/tenant/branding";
import { cn } from "@/lib/utils";

type TenantUserLandingProps = {
  data: TenantMarketingLandingData;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function TenantUserLanding({ data }: TenantUserLandingProps) {
  const displayName = resolveTenantBrandName(data.tenant.name);
  const slogan = data.branding.slogan?.trim() || "회원이 가장 먼저 만나는 테넌트 유저 랜딩";
  const description =
    data.branding.description?.trim() ||
    "스토어 상품 탐색과 예약 서비스 진입을 같은 브랜드 경험 안에서 자연스럽게 이어 주는 유저 전용 시작 화면입니다.";
  const storePath = getTenantStorePath(data.tenant.slug);
  const bookingPath = `/t/${data.tenant.slug}/booking`;
  const showBookingCta = process.env.NEXT_PUBLIC_MODE === "development";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <section className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,rgba(201,255,225,0.95),transparent_36%),linear-gradient(135deg,#ffffff_0%,#f7f7f3_48%,#eef4ff_100%)] px-6 py-8 shadow-lg shadow-zinc-900/5 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-800">
              Tenant Landing
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">{displayName}</h1>
              <p className="text-lg font-medium text-zinc-800">{slogan}</p>
              <p className="max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">{description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-zinc-950 text-white hover:bg-zinc-800">
                <Link href={storePath}>
                  스토어 바로가기
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              {showBookingCta ? (
                <Button asChild size="lg" variant="outline">
                  <Link href={bookingPath}>
                    예약 서비스 바로가기
                    <CalendarClock className="size-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-zinc-200/80 bg-white/85 p-5 shadow-sm shadow-zinc-900/5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Primary Access</p>
              <p className="mt-3 text-xl font-semibold text-zinc-950">스토어와 예약 서비스 진입</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">유저는 이 랜딩에서 구매와 예약 흐름으로 바로 이동합니다.</p>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-zinc-950 p-5 text-white shadow-sm shadow-zinc-900/10">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/55">Brand Layer</p>
              <p className="mt-3 text-xl font-semibold">테넌트 전용 헤더와 푸터</p>
              <p className="mt-2 text-sm leading-6 text-white/72">기존 공용 헤더/푸터 대신 테넌트 브랜드 문맥을 유지하는 공용 셸을 사용합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={cn("grid gap-4", showBookingCta ? "md:grid-cols-2" : "md:grid-cols-1")}>
        <NonBorderCard>
          <CardHeader className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <ShoppingBag className="size-5" />
            </div>
            <div>
              <CardTitle className="text-zinc-950">스토어</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-zinc-600">
                판매 중인 프로그램을 확인하고 결제 흐름으로 바로 이동할 수 있습니다.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href={storePath}>스토어 열기</Link>
            </Button>
          </CardContent>
        </NonBorderCard>

        {showBookingCta ? (
          <NonBorderCard>
            <CardHeader className="space-y-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <CalendarClock className="size-5" />
              </div>
              <div>
                <CardTitle className="text-zinc-950">예약 서비스</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6 text-zinc-600">
                  예약 유저 페이지를 붙이기 전 단계로, 지금은 진입 구조와 탐색 동선을 먼저 정리합니다.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href={bookingPath}>예약 서비스 보기</Link>
              </Button>
            </CardContent>
          </NonBorderCard>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">대표 프로그램</h2>
            <p className="mt-1 text-sm text-zinc-600">현재 공개된 상품을 먼저 살펴보고 구매 흐름으로 이어질 수 있습니다.</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href={storePath}>전체 상품 보기</Link>
          </Button>
        </div>

        {data.products.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {data.products.map((product) => (
              <Link key={product.id} href={getTenantStoreProductPath(data.tenant.slug, product.id)} className="group block">
                <NonBorderCard className="h-full transition-all duration-200 hover:-translate-y-1">
                  <CardHeader className="space-y-3">
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-100">
                      <Image
                        src={product.program.thumbnail_url || product.thumbnail_urls[0] || "/logo.png"}
                        alt={`${product.program.title} 썸네일`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
                    <div>
                      <CardTitle className="line-clamp-2 text-base leading-snug text-zinc-950">{product.program.title}</CardTitle>
                      <CardDescription className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-600">
                        {product.program.description || "프로그램 소개를 확인해 보세요."}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-zinc-700">
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-zinc-500">운동시간</span>
                      <span>{product.program.daily_workout_minutes}분</span>
                    </p>
                    <p className="flex items-center justify-between gap-3">
                      <span className="text-zinc-500">주당횟수</span>
                      <span>주 {product.program.days_per_week}회</span>
                    </p>
                    <p className="pt-2 text-right text-base font-semibold text-zinc-950">
                      {formatCurrency(product.price_krw)}원{product.sale_type === "subscription" ? " / 월" : "부터"}
                    </p>
                  </CardContent>
                </NonBorderCard>
              </Link>
            ))}
          </div>
        ) : (
          <NonBorderCard>
            <CardContent className="py-8 text-center text-sm text-zinc-500">현재 공개된 프로그램 상품이 없습니다.</CardContent>
          </NonBorderCard>
        )}
      </section>
    </main>
  );
}
