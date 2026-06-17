import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import type { TenantMarketingLandingData } from "@/lib/landing/server";
import { resolveTenantBrandName } from "@/lib/tenant/branding";

type TenantMarketingLandingProps = {
  data: TenantMarketingLandingData;
};

export function TenantMarketingLanding({ data }: TenantMarketingLandingProps) {
  const displayName = resolveTenantBrandName(data.tenant.name);
  const slogan = data.branding.slogan?.trim() || "코치 운영 복잡도는 줄이고 회원 성과는 높이는 트레이닝 솔루션";
  const description = data.branding.description?.trim() || "코치 중심 운영 흐름으로 프로그램 배포, 기록 확인, 성과 추적을 한 곳에서 관리하세요.";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-white/95 p-6 shadow-lg shadow-zinc-900/5 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-3xl space-y-4">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-800">
              TENANT MARKETING
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">{displayName}</h1>
            <p className="text-lg font-medium text-zinc-800">{slogan}</p>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600">{description}</p>
          </div>

          {data.branding.logo_url ? (
            <div className="relative size-20 overflow-hidden rounded-2xl bg-zinc-50 shadow-md shadow-zinc-900/10 sm:size-24">
              <Image src={data.branding.logo_url} alt={`${displayName} 로고`} fill className="object-cover" />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
