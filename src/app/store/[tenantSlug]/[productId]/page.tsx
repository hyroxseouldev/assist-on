import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

import { ChevronLeft, Instagram } from "lucide-react";

import { BuyNowButton } from "@/components/store/buy-now-button";
import { ProductThumbnailSlider } from "@/components/store/product-thumbnail-slider";
import { StoreDetailAnchorTabs } from "@/components/store/store-detail-anchor-tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicHeader } from "@/components/navigation/public-header";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreProductById, hasActiveEntitlement } from "@/lib/store/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDifficulty(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "초급";
  if (value === "advanced") return "고급";
  return "중급";
}

function normalizeInstagram(instagram: string) {
  const trimmed = instagram.trim();
  if (!trimmed) {
    return "";
  }

  const withoutPrefix = trimmed
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");

  return withoutPrefix;
}

export default async function PublicStoreProductPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; productId: string }>;
}) {
  const { tenantSlug, productId } = await params;
  const data = await getStoreProductById(tenantSlug, productId);

  if (!data) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const purchased = user ? await hasActiveEntitlement(user.id, data.tenant.id, data.product.program_id) : false;
  const thumbnailImages = Array.from(
    new Set(
      [...data.product.thumbnail_urls, data.product.program.thumbnail_url]
        .map((image) => (typeof image === "string" ? image.trim() : ""))
        .filter((image) => image.length > 0)
    )
  );
  const coachName = data.product.coach?.name?.trim() || "코치";
  const coachInstagram = normalizeInstagram(data.product.coach?.instagram || "");
  const coachCareer = data.product.coach?.career ?? [];
  const coachImageUrl = data.product.coach?.image_url || "";

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <Button asChild variant="outline" size="sm">
          <Link href={`/store/${tenantSlug}`}>
            <ChevronLeft className="size-4" />
            스토어로
          </Link>
        </Button>

        <section className="mt-4 space-y-6">
          <ProductThumbnailSlider images={thumbnailImages} title={data.product.program.title} />

          <Card className="border-zinc-200/70 bg-white/95">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Program</Badge>
                <Badge variant={data.product.sale_type === "subscription" ? "default" : "outline"}>
                  {data.product.sale_type === "subscription" ? "월 구독" : "1회 결제"}
                </Badge>
                {purchased ? <Badge>구매 완료</Badge> : null}
              </div>

              <CardTitle className="text-2xl leading-tight tracking-tight text-zinc-900">{data.product.program.title}</CardTitle>

              <div className="flex items-center gap-3">
                <Avatar className="size-10 border border-zinc-200">
                  <AvatarImage src={coachImageUrl} alt={`${coachName} 아바타`} />
                  <AvatarFallback>{coachName.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <p className="text-sm text-zinc-700">
                  코치 <span className="font-semibold text-zinc-900">{coachName}</span>
                </p>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-xs text-zinc-500">가격</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
                  {formatCurrency(data.product.price_krw)}원{data.product.sale_type === "subscription" ? " / 월" : ""}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {data.product.sale_type === "subscription"
                    ? "구독 시작 시 첫 결제가 진행되며, 이후 월 단위로 자동 결제됩니다."
                    : "결제 완료 후 즉시 접근 권한이 활성화됩니다."}
                </p>
              </div>
            </CardHeader>

            <CardContent>
              {purchased ? (
                <Button asChild className="w-full">
                  <Link href={`/t/${tenantSlug}`}>프로그램 홈으로 이동</Link>
                </Button>
              ) : (
                <BuyNowButton tenantSlug={tenantSlug} productId={data.product.id} saleType={data.product.sale_type} />
              )}
            </CardContent>
          </Card>

          <StoreDetailAnchorTabs />

          <section id="program-intro" className="scroll-mt-28 space-y-5 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">프로그램 소개</h2>
              <CardDescription>프로그램 구성과 운영 정보를 확인할 수 있습니다.</CardDescription>
            </div>

            {data.product.content_html ? (
              <article
                className="prose prose-zinc max-w-none text-sm [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: sanitizeSessionContent(data.product.content_html) }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {data.product.program.description || "상세 설명은 관리자에서 업데이트할 수 있습니다."}
              </p>
            )}

            <div className="grid gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2">
              <p className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">난이도</span>
                <Badge variant="outline">{formatDifficulty(data.product.program.difficulty)}</Badge>
              </p>
              <p className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">기간</span>
                <span>
                  {data.product.program.start_date} - {data.product.program.end_date}
                </span>
              </p>
              <p className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">횟수</span>
                <span>주 {data.product.program.days_per_week}회</span>
              </p>
              <p className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">운동시간</span>
                <span>{data.product.program.daily_workout_minutes}분</span>
              </p>
            </div>
          </section>

          <section id="trainer-intro" className="scroll-mt-28 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">트레이너 소개</h2>

            <div className="relative h-64 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 sm:h-80">
              <Image src={coachImageUrl || "/xon_logo.jpg"} alt={`${coachName} 대표 이미지`} fill className="object-cover" />
            </div>

            <div className="space-y-3 text-sm text-zinc-700">
              <p>
                트레이너 이름 <span className="ml-2 font-semibold text-zinc-900">{coachName}</span>
              </p>

              <div className="space-y-1">
                <p className="text-zinc-500">트레이너 경력</p>
                {coachCareer.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-zinc-700">
                    {coachCareer.map((career) => (
                      <li key={career}>{career}</li>
                    ))}
                  </ul>
                ) : (
                  <p>등록된 경력이 없습니다.</p>
                )}
              </div>

              {coachInstagram ? (
                <a
                  href={`https://instagram.com/${coachInstagram}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-zinc-900 underline decoration-zinc-300 underline-offset-4"
                >
                  <Instagram className="size-4" />@{coachInstagram}
                </a>
              ) : null}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
