import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { StoreCheckoutForm } from "@/components/store/store-checkout-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedLegalDocumentByType, normalizeLegalContentHtml } from "@/lib/legal/server";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { formatDurationPassLabel, parseDurationPassMonths } from "@/lib/store/duration-options";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPendingOrderForProduct, getStoreProductById, hasActiveEntitlement } from "@/lib/store/server";

export default async function StoreCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string; productId: string }>;
  searchParams: Promise<{ duration?: string }>;
}) {
  const { tenantSlug, productId } = await params;
  const { duration } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/store/${tenantSlug}/${productId}/checkout`)}`);
  }

  const data = await getStoreProductById(tenantSlug, productId);
  if (!data) {
    notFound();
  }

  const [electronicCommerceDocument, privacyDocument] = await Promise.all([
    getPublishedLegalDocumentByType(tenantSlug, "electronic_commerce_terms", "ko"),
    getPublishedLegalDocumentByType(tenantSlug, "privacy_policy", "ko"),
  ]);

  if (data.product.sale_status !== "active") {
    notFound();
  }

  const purchased = await hasActiveEntitlement(user.id, data.tenant.id, data.product.program_id);
  const pendingOrder = await getPendingOrderForProduct({
    userId: user.id,
    tenantId: data.tenant.id,
    productId: data.product.id,
  });

  if (purchased) {
    redirect(`/store/${tenantSlug}/${productId}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle<{ full_name: string | null }>();

  const initialBuyerName =
    profile?.full_name?.trim() ||
    (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name.trim() : "") ||
    user.email ||
    "회원";
  const productThumbnailUrl =
    data.product.thumbnail_urls[0] || data.product.program.thumbnail_url || "/xon_logo.jpg";
  const selectedDuration = parseDurationPassMonths(duration);
  const selectedDurationOption =
    data.product.sale_type === "one_time"
      ? data.product.duration_options.find((option) => option.duration_months === selectedDuration && option.is_enabled) ??
        data.product.duration_options.find((option) => option.is_enabled) ??
        null
      : null;

  if (data.product.sale_type === "one_time" && !selectedDurationOption) {
    redirect(`/store/${tenantSlug}/${productId}`);
  }

  const checkoutPrice = selectedDurationOption?.price_krw ?? data.product.price_krw;
  const checkoutTitle = data.product.program.title;

  if (pendingOrder) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="mb-6 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Checkout</Badge>
            <Badge variant="outline">주문 확인 중</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">진행 중인 주문이 있습니다</h1>
          <p className="text-sm text-zinc-600">같은 상품에 대한 중복 주문을 막기 위해 현재 결제를 잠시 제한합니다.</p>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>{checkoutTitle}</CardTitle>
            <CardDescription>
              주문번호 {pendingOrder.provider_order_id}
              {pendingOrder.duration_months ? ` · ${formatDurationPassLabel(pendingOrder.duration_months)}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-600">
              {pendingOrder.payment_method === "bank_transfer"
                ? "입금 대기 중인 주문이 있습니다. 계좌 정보와 주문 상태는 구매 내역에서 다시 확인할 수 있습니다."
                : "이미 처리 중인 결제가 있습니다. 잠시 후 구매 내역에서 상태를 확인해 주세요."}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/mypage/orders/${pendingOrder.id}`}>주문 상세 보기</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/mypage/orders">구매 내역 보기</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/store/${tenantSlug}/${productId}`}>상품으로 돌아가기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Checkout</Badge>
          <Badge variant={data.product.sale_type === "subscription" ? "default" : "outline"}>
            {data.product.sale_type === "subscription" ? "월 구독" : selectedDurationOption ? formatDurationPassLabel(selectedDurationOption.duration_months) : "기간권"}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">결제 페이지</h1>
        <p className="text-sm text-zinc-600">프로그램 정보와 구매자 정보를 확인한 뒤 주문을 접수해 주세요.</p>
      </section>

      <StoreCheckoutForm
        tenantSlug={tenantSlug}
        productId={data.product.id}
        productTitle={checkoutTitle}
        productPrice={checkoutPrice}
        productThumbnailUrl={productThumbnailUrl}
        productSaleType={data.product.sale_type}
        durationMonths={selectedDurationOption?.duration_months ?? null}
        userEmail={user.email ?? ""}
        initialBuyerName={initialBuyerName}
        bankAccount={data.product.bank_account}
        legalContent={{
          electronicCommerceTitle: electronicCommerceDocument?.title || "전자상거래 이용약관",
          electronicCommerceHtml: electronicCommerceDocument
            ? sanitizeSessionContent(normalizeLegalContentHtml(electronicCommerceDocument.content_html))
            : "",
          privacyTitle: privacyDocument?.title || "개인정보처리방침",
          privacyHtml: privacyDocument ? sanitizeSessionContent(normalizeLegalContentHtml(privacyDocument.content_html)) : "",
        }}
      />
    </main>
  );
}
