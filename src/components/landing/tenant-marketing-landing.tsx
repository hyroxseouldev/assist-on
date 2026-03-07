import Image from "next/image";
import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TenantMarketingLandingData } from "@/lib/landing/server";

type TenantMarketingLandingProps = {
  data: TenantMarketingLandingData;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDifficulty(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "초급";
  if (value === "advanced") return "고급";
  return "중급";
}

export function TenantMarketingLanding({ data }: TenantMarketingLandingProps) {
  const displayName = data.branding.team_name?.trim() || data.tenant.name;
  const slogan = data.branding.slogan?.trim() || "코치 운영 복잡도는 줄이고 회원 성과는 높이는 트레이닝 솔루션";
  const description = data.branding.description?.trim() || "코치 중심 운영 흐름으로 프로그램 배포, 기록 확인, 성과 추적을 한 곳에서 관리하세요.";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-zinc-200 bg-white/95 p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl space-y-4">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
              TENANT MARKETING
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">{displayName}</h1>
            <p className="text-lg font-medium text-zinc-800">{slogan}</p>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600">{description}</p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild>
                <Link href={`/store/${data.tenant.slug}`}>
                  스토어 바로가기
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
           
            </div>
          </div>

          {data.branding.logo_url ? (
            <div className="relative size-20 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 sm:size-24">
              <Image src={data.branding.logo_url} alt={`${displayName} 로고`} fill className="object-cover" />
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">대표 프로그램</h2>
          <Link href={`/store/${data.tenant.slug}`} className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
            전체 보기
          </Link>
        </div>

        {data.products.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {data.products.map((product) => (
              <Card key={product.id} className="border-zinc-200/80 bg-white/95">
                <CardHeader className="space-y-3">
                  <div className="relative aspect-square w-full overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
                    <Image
                      src={product.program.thumbnail_url || product.thumbnail_urls[0] || "/xon_logo.jpg"}
                      alt={`${product.program.title} 썸네일`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <CardTitle className="line-clamp-2 text-base leading-snug text-zinc-900">{product.program.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{product.program.description || "프로그램 소개를 확인해 보세요."}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-zinc-700">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">난이도</span>
                    <span>{formatDifficulty(product.program.difficulty)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">운동시간</span>
                    <span>{product.program.daily_workout_minutes}분</span>
                  </p>
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-zinc-500">주당횟수</span>
                    <span>주 {product.program.days_per_week}회</span>
                  </p>
                  <p className="pt-2 text-right text-base font-semibold text-zinc-900">
                    {formatCurrency(product.price_krw)}원{product.sale_type === "subscription" ? " / 월" : ""}
                  </p>
                  <Button asChild className="mt-1 w-full" variant="outline">
                    <Link href={`/store/${data.tenant.slug}/${product.id}`}>상세 보기</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-zinc-200/80 bg-white/95">
            <CardContent className="py-8 text-center text-sm text-zinc-500">현재 판매 중인 프로그램이 없습니다.</CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
