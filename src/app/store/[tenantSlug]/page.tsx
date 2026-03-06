import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

import { PublicHeader } from "@/components/navigation/public-header";
import { getStoreProductsByTenantSlug } from "@/lib/store/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatDifficulty(value: "beginner" | "intermediate" | "advanced") {
  if (value === "beginner") return "초급";
  if (value === "advanced") return "고급";
  return "중급";
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
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">{data.tenant.name} 스토어</h1>
          <p className="text-sm text-zinc-600">구매 즉시 프로그램 접근 권한이 활성화됩니다.</p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {data.products.map((product) => (
            <Link
              key={product.id}
              href={`/store/${tenantSlug}/${product.id}`}
              className="group rounded-xl bg-white/95 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="space-y-2.5">
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100">
                  <Image
                    src={product.program.thumbnail_url || product.thumbnail_urls[0] || "/xon_logo.jpg"}
                    alt={`${product.program.title} 썸네일`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>

                <h2 className="text-base font-semibold leading-snug text-zinc-900">{product.program.title}</h2>

                <div className="space-y-1.5 text-sm">
                  <p className="flex items-center justify-between gap-3 text-zinc-700">
                    <span className="text-zinc-500">기간</span>
                    <span className="text-right text-zinc-800">
                      {product.program.start_date} - {product.program.end_date}
                    </span>
                  </p>
                  <p className="flex items-center justify-between gap-3 text-zinc-700">
                    <span className="text-zinc-500">난이도</span>
                    <span className="text-zinc-800">{formatDifficulty(product.program.difficulty)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3 text-zinc-700">
                    <span className="text-zinc-500">운동시간</span>
                    <span className="text-zinc-800">{product.program.daily_workout_minutes}분</span>
                  </p>
                  <p className="flex items-center justify-between gap-3 text-zinc-700">
                    <span className="text-zinc-500">주당횟수</span>
                    <span className="text-zinc-800">주 {product.program.days_per_week}회</span>
                  </p>
                </div>

                <p className="line-clamp-2 text-sm text-zinc-600">{product.program.description || "설명이 없습니다."}</p>

                <div className="pt-1 text-right">
                  <p className="text-base font-semibold text-zinc-900 group-hover:text-zinc-950">
                    {formatCurrency(product.price_krw)}원{product.sale_type === "subscription" ? " / 월" : ""}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {data.products.length === 0 ? (
            <div className="rounded-xl bg-white px-4 py-10 text-center text-sm text-zinc-500 md:col-span-2">
              현재 판매 중인 프로그램이 없습니다.
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
