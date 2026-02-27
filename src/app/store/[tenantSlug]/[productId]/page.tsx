import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { BuyNowButton } from "@/components/store/buy-now-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreProductById, hasActiveEntitlement } from "@/lib/store/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Button asChild variant="outline" size="sm">
        <Link href={`/store/${tenantSlug}`}>
          <ChevronLeft className="size-4" />
          스토어로
        </Link>
      </Button>

      <Card className="mt-4 border-zinc-200/70 bg-white/95">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Program</Badge>
            {purchased ? <Badge>구매 완료</Badge> : null}
          </div>
          <CardTitle className="text-2xl leading-tight tracking-tight text-zinc-900">{data.product.program.title}</CardTitle>
          <CardDescription>
            운영 기간: {data.product.program.start_date} - {data.product.program.end_date}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700">
            {data.product.program.description || "상세 설명은 관리자에서 업데이트할 수 있습니다."}
          </p>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs text-zinc-500">결제 금액</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{formatCurrency(data.product.price_krw)}원</p>
            <p className="mt-2 text-xs text-zinc-500">결제 완료 후 즉시 접근 권한이 활성화됩니다.</p>
          </div>

          {purchased ? (
            <Button asChild className="w-full">
              <Link href={`/t/${tenantSlug}`}>프로그램 홈으로 이동</Link>
            </Button>
          ) : (
            <BuyNowButton tenantSlug={tenantSlug} productId={data.product.id} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
