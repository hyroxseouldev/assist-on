import Image from "next/image";
import Link from "next/link";

import { PublicHeader } from "@/components/navigation/public-header";
import { getStoreTenantDirectory } from "@/lib/store/server";

export default async function StoreDirectoryPage() {
  const tenants = await getStoreTenantDirectory();

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <section className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">테넌트 스토어</h1>
          <p className="text-sm text-zinc-600">원하는 팀을 선택하고 스토어로 이동해 프로그램을 확인해 보세요.</p>
        </section>

        <section className="mt-6 space-y-3">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
              <Link href={`/store/${tenant.slug}`} className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
                    <Image src={tenant.logo_url || "/xon_logo.jpg"} alt={`${tenant.name} 로고`} fill className="object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-zinc-900">{tenant.name}</p>
                    <p className="truncate text-sm text-zinc-500">{tenant.slogan || "팀 소개 문구가 아직 등록되지 않았습니다."}</p>
                  </div>
                </div>
                <div className="shrink-0 text-sm font-medium text-zinc-700">스토어 보기</div>
              </Link>
            </div>
          ))}

          {tenants.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
              현재 공개된 스토어 상품이 없습니다.
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
