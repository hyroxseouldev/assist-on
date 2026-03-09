import { redirect, notFound } from "next/navigation";

import { StoreCheckoutForm } from "@/components/store/store-checkout-form";
import { Badge } from "@/components/ui/badge";
import { getPublishedLegalDocumentByType, normalizeLegalContentHtml } from "@/lib/legal/server";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreProductById, hasActiveEntitlement } from "@/lib/store/server";

export default async function StoreCheckoutPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; productId: string }>;
}) {
  const { tenantSlug, productId } = await params;
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

  const [termsDocument, privacyDocument] = await Promise.all([
    getPublishedLegalDocumentByType(tenantSlug, "terms_of_service", "ko"),
    getPublishedLegalDocumentByType(tenantSlug, "privacy_policy", "ko"),
  ]);

  if (data.product.sale_status !== "active") {
    notFound();
  }

  const purchased = await hasActiveEntitlement(user.id, data.tenant.id, data.product.program_id);

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

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="mb-6 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Checkout</Badge>
          <Badge variant={data.product.sale_type === "subscription" ? "default" : "outline"}>
            {data.product.sale_type === "subscription" ? "월 구독" : "1회 결제"}
          </Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">결제 페이지</h1>
        <p className="text-sm text-zinc-600">프로그램 정보와 구매자 정보를 확인한 뒤 주문을 접수해 주세요.</p>
      </section>

      <StoreCheckoutForm
        tenantSlug={tenantSlug}
        productId={data.product.id}
        productTitle={data.product.program.title}
        productPrice={data.product.price_krw}
        productThumbnailUrl={productThumbnailUrl}
        productSaleType={data.product.sale_type}
        userEmail={user.email ?? ""}
        initialBuyerName={initialBuyerName}
        bankAccount={data.product.bank_account}
        legalContent={{
          termsTitle: termsDocument?.title || "이용약관",
          termsHtml: termsDocument ? sanitizeSessionContent(normalizeLegalContentHtml(termsDocument.content_html)) : "",
          privacyTitle: privacyDocument?.title || "개인정보처리방침",
          privacyHtml: privacyDocument ? sanitizeSessionContent(normalizeLegalContentHtml(privacyDocument.content_html)) : "",
        }}
      />
    </main>
  );
}
