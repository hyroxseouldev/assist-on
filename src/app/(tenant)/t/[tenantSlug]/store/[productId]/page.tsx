import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Instagram } from "lucide-react";

import { TiptapContent } from "@/components/admin/tiptap-content";
import { ProductThumbnailSlider } from "@/components/store/product-thumbnail-slider";
import { StoreDetailAnchorTabs } from "@/components/store/store-detail-anchor-tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { formatDurationPassLabel } from "@/lib/store/duration-options";
import { getTenantStoreCheckoutPath } from "@/lib/store/paths";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPendingOrderForProduct, getStoreProductById, hasActiveEntitlement } from "@/lib/store/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDifficulty(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "초급";
  if (value === "advanced") return "고급";
  return "중급";
}

function getDifficultyBadgeClassName(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (value === "advanced") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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

const STORE_DETAIL_FAQS = [
  {
    question: "상품은 언제부터 이용할 수 있나요?",
    answer:
      "결제 완료 후 바로 이용할 수 있어요. 일부 상품은 준비 시간이 조금 필요할 수 있으며, 자세한 안내는 상품 상세에서 확인할 수 있습니다.",
  },
  {
    question: "환불이 가능한가요?",
    answer:
      "상품 특성에 따라 환불 가능 여부가 달라질 수 있어요. 사용 전 상태이거나 제공이 시작되지 않은 경우 환불이 가능할 수 있으며, 자세한 기준은 환불 정책을 확인해 주세요.",
  },
  {
    question: "구매한 상품은 어디서 확인할 수 있나요?",
    answer:
      "마이페이지 또는 주문 내역에서 구매한 상품을 확인할 수 있어요. 이용 가능한 상태인 경우 바로 접근할 수 있습니다.",
  },
  {
    question: "상품 이용 기간이 정해져 있나요?",
    answer:
      "일부 상품은 이용 기간이 정해져 있을 수 있어요. 이용 기간이 있는 경우 상품 상세 페이지에 별도로 안내됩니다.",
  },
  {
    question: "결제 수단은 어떤 것이 있나요?",
    answer:
      "신용카드, 간편결제 등 다양한 결제 수단을 지원할 수 있어요. 실제 제공되는 결제 수단은 결제 화면에서 확인해 주세요.",
  },
  {
    question: "구매 후 바로 취소할 수 있나요?",
    answer:
      "상품이 아직 사용되지 않았거나 제공이 시작되지 않은 경우 취소가 가능할 수 있어요. 단, 디지털 상품이나 즉시 제공 상품은 제한될 수 있습니다.",
  },
  {
    question: "다른 사람에게 양도하거나 공유할 수 있나요?",
    answer:
      "구매한 상품은 본인 사용을 원칙으로 하며, 타인에게 양도 또는 계정 공유는 제한될 수 있어요.",
  },
  {
    question: "상품 이용 중 문제가 생기면 어떻게 하나요?",
    answer:
      "이용 중 오류나 불편 사항이 있다면 고객센터 또는 문의하기를 통해 접수해 주세요. 확인 후 빠르게 도와드릴게요.",
  },
  {
    question: "할인이나 쿠폰은 중복 적용이 가능한가요?",
    answer:
      "쿠폰 및 할인 혜택은 정책에 따라 중복 적용이 제한될 수 있어요. 적용 가능 여부는 결제 단계에서 확인할 수 있습니다.",
  },
  {
    question: "상품 상세 내용과 실제 제공 내용이 다를 수 있나요?",
    answer:
      "기본적으로 상품 상세에 안내된 내용을 기준으로 제공돼요. 다만 운영 정책이나 업데이트에 따라 일부 구성은 변경될 수 있으며, 중요한 변경 사항은 별도로 안내됩니다.",
  },
] as const;

export default async function TenantStoreProductRedirectPage({
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
  const pendingOrder = user
    ? await getPendingOrderForProduct({
        userId: user.id,
        tenantId: data.tenant.id,
        productId: data.product.id,
      })
    : null;
  const thumbnailImages = Array.from(
    new Set(
      (data.product.thumbnail_urls.length > 0
        ? data.product.thumbnail_urls
        : data.product.program.thumbnail_url
          ? [data.product.program.thumbnail_url]
          : []
      )
        .map((image) => (typeof image === "string" ? image.trim() : ""))
        .filter((image) => image.length > 0)
    )
  );
  const coachName = data.product.coach?.name?.trim() || "코치";
  const coachInstagram = normalizeInstagram(data.product.coach?.instagram || "");
  const coachCareer = data.product.coach?.career ?? [];
  const coachImageUrl = data.product.coach?.image_url || "";
  const isPreparing = data.product.sale_status === "preparing";
  const enabledDurationOptions = data.product.duration_options.filter((option) => option.is_enabled);
  return (
    <main className="mx-auto w-full max-w-4xl px-0 sm:px-6">
      <section className="space-y-6">
        <ProductThumbnailSlider images={thumbnailImages} title={data.product.program.title} />

        <Card className="border-0 bg-white/95 shadow-none">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Program</Badge>
              <Badge variant={data.product.sale_type === "subscription" ? "default" : "outline"}>
                {data.product.sale_type === "subscription" ? "월 구독" : "기간권"}
              </Badge>
              {isPreparing ? <Badge variant="secondary">준비중</Badge> : null}
              {purchased ? <Badge>구매 완료</Badge> : null}
              {pendingOrder ? <Badge variant="secondary">주문 확인 중</Badge> : null}
            </div>

            <CardTitle className="text-2xl leading-tight tracking-tight text-zinc-900">{data.product.program.title}</CardTitle>

            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={coachImageUrl} alt={`${coachName} 아바타`} />
                <AvatarFallback>{coachName.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-zinc-700">
                <span className="font-semibold text-zinc-900">{coachName}</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">가격</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
                {formatCurrency(data.product.price_krw)}원
                {data.product.sale_type === "subscription" ? " / 월" : enabledDurationOptions.length > 0 ? "부터" : ""}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {data.product.sale_type === "subscription"
                  ? "결제 페이지에서 구독 정보를 확인할 수 있습니다."
                  : "결제 페이지에서 주문을 접수하고 입금 확인 후 선택한 기간만큼 접근 권한이 활성화됩니다."}
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {purchased ? (
              <div className="space-y-3">
                <Button className="h-14 w-full rounded-lg text-base" disabled>
                  구매 완료
                </Button>
                <p className="text-center text-xs text-zinc-500">구매한 프로그램은 앱에서 확인해 주세요.</p>
              </div>
            ) : pendingOrder ? (
              <div className="space-y-3">
                <Button asChild className="h-14 w-full rounded-lg text-base">
                  <Link href="/mypage/orders">구매 내역 확인하기</Link>
                </Button>
                <p className="text-center text-xs text-zinc-500">
                  {pendingOrder.payment_method === "bank_transfer"
                    ? "이미 입금 대기 중인 주문이 있습니다. 주문번호와 계좌 정보는 구매 내역에서 다시 확인할 수 있습니다."
                    : "이미 처리 중인 주문이 있습니다. 구매 내역에서 결제 상태를 확인해 주세요."}
                </p>
              </div>
            ) : isPreparing ? (
              <div className="flex h-14 w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-center text-sm font-medium text-zinc-600 sm:text-base">
                준비중 상품입니다. 현재 구매할 수 없습니다.
              </div>
            ) : data.product.sale_type === "one_time" ? (
              enabledDurationOptions.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-900">이용 기간을 선택해 주세요.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {enabledDurationOptions.map((option) => (
                      <div key={option.duration_months} className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3">
                        <p className="text-sm font-semibold text-zinc-900">{formatDurationPassLabel(option.duration_months)}</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900">{formatCurrency(option.price_krw)}원</p>
                        <Button asChild className="mt-3 h-11 w-full rounded-lg text-sm">
                          <Link href={`${getTenantStoreCheckoutPath(tenantSlug, data.product.id)}?duration=${option.duration_months}`}>
                            이 옵션으로 결제
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-14 w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-center text-sm font-medium text-zinc-600 sm:text-base">
                  현재 구매 가능한 기간권 옵션이 없습니다.
                </div>
              )
            ) : (
              <Button asChild className="h-14 w-full rounded-lg text-base">
                <Link href={getTenantStoreCheckoutPath(tenantSlug, data.product.id)}>결제하기</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <StoreDetailAnchorTabs />

        <section id="program-intro" className="scroll-mt-28 space-y-5 bg-white">
          {data.product.intro_image_url ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-none bg-zinc-100">
              <Image src={data.product.intro_image_url} alt={`${data.product.program.title} 소개 이미지`} fill className="rounded-none object-cover" />
            </div>
          ) : null}
          <div className="space-y-6 px-4 py-6">
            <div className="space-y-1">
              <h2 className="text-lg font-bold tracking-tight text-zinc-900">프로그램 소개</h2>
              <CardDescription>프로그램 구성과 운영 정보를 확인할 수 있습니다.</CardDescription>
            </div>

            {data.product.content_html ? (
              <TiptapContent value={sanitizeSessionContent(data.product.content_html)} />
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {data.product.program.description || "상세 설명은 관리자에서 업데이트할 수 있습니다."}
              </p>
            )}

            <div className="grid grid-cols-1 gap-2">
              <p className="flex h-14 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">난이도</span>
                <Badge variant="outline" className={getDifficultyBadgeClassName(data.product.program.difficulty)}>
                  {formatDifficulty(data.product.program.difficulty)}
                </Badge>
              </p>
              <p className="flex h-14 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">기간</span>
                <span className="font-semibold">
                  {data.product.program.start_date} - {data.product.program.end_date}
                </span>
              </p>
              <p className="flex h-14 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">횟수</span>
                <span className="font-semibold">주 {data.product.program.days_per_week}회</span>
              </p>
              <p className="flex h-14 items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <span className="text-zinc-500">운동시간</span>
                <span className="font-semibold">{data.product.program.daily_workout_minutes}분</span>
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-28 space-y-4 bg-white px-4 py-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-zinc-900">FAQ</h2>
            <CardDescription>구매 전 자주 확인하는 내용을 한눈에 볼 수 있습니다.</CardDescription>
          </div>

          <Accordion type="single" collapsible className="rounded-lg border border-zinc-200 bg-white px-4">
            {STORE_DETAIL_FAQS.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index + 1}`}>
                <AccordionTrigger className="text-sm font-semibold text-zinc-900 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="leading-6 text-zinc-600">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section id="trainer-intro" className="scroll-mt-28 space-y-4 bg-white">
          <div className="relative aspect-video w-full overflow-hidden rounded-none bg-zinc-100">
            <Image src={coachImageUrl || "/logo.png"} alt={`${coachName} 대표 이미지`} fill className="object-cover" />
          </div>

          <div className="space-y-6 px-4 py-6">
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">코치 소개</h2>

            <span className="text-xl font-bold">{coachName} 코치</span>

            <div className="mt-2 space-y-1">
              {coachCareer.length > 0 ? (
                <ul className="list-inside list-disc space-y-1 pl-0 text-xs text-zinc-500 marker:text-[10px] marker:text-zinc-400">
                  {coachCareer.map((career) => (
                    <li key={career}>{career}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">등록된 경력이 없습니다.</p>
              )}
            </div>

            {coachInstagram ? (
              <Button
                asChild
                variant="ghost"
                className="h-auto w-fit gap-2 px-0 font-semibold text-blue-600 underline underline-offset-4 hover:bg-transparent hover:text-blue-700"
              >
                <a href={`https://instagram.com/${coachInstagram}`} target="_blank" rel="noreferrer" className="group">
                  <Instagram className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />@{coachInstagram}
                </a>
              </Button>
            ) : null}
          </div>
        </section>

     
      </section>
    </main>
  );
}
