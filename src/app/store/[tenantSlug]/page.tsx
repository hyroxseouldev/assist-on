import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getStoreProductsByTenantSlug } from "@/lib/store/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export default async function PublicStorePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const data = await getStoreProductsByTenantSlug(tenantSlug);

  if (!data) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{data.tenant.name} 스토어</h1>
        <p className="text-sm text-zinc-600">구매 즉시 프로그램 접근 권한이 활성화됩니다.</p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {data.products.map((product) => (
          <Card key={product.id} className="border-zinc-200/70 bg-white/95">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg leading-snug">{product.program.title}</CardTitle>
              <CardDescription>
                {product.program.start_date} - {product.program.end_date}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-2 text-sm text-zinc-600">{product.program.description || "프로그램 상세 페이지에서 내용을 확인하세요."}</p>
              <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                <p className="text-lg font-semibold text-zinc-900">{formatCurrency(product.price_krw)}원</p>
                <Link
                  href={`/store/${tenantSlug}/${product.id}`}
                  className="text-sm text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900"
                >
                  상세 보기
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}

        {data.products.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-10 text-center text-sm text-zinc-500">현재 판매 중인 프로그램이 없습니다.</CardContent>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
