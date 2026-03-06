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

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/store/${tenant.slug}`}
              className="group rounded-xl bg-white px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-zinc-100">
                  <Image
                    src={tenant.logo_url || "/xon_logo.jpg"}
                    alt={`${tenant.name} 로고`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-zinc-900">{tenant.name}</p>
                  <p className="truncate text-sm text-zinc-500">{tenant.slogan || "팀 소개 문구가 아직 등록되지 않았습니다."}</p>
                </div>
              </div>
            </Link>
          ))}

          {tenants.length === 0 ? (
            <div className="rounded-xl bg-white px-4 py-10 text-center text-sm text-zinc-500 md:col-span-2 xl:col-span-3">
              현재 공개된 스토어 상품이 없습니다.
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
