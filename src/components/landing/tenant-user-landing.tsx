import { Dumbbell, ShieldCheck } from "lucide-react";

import { CardDescription, CardHeader, CardTitle, NonBorderCard } from "@/components/ui/card";
import type { TenantMarketingLandingData } from "@/lib/landing/server";
import { resolveTenantBrandName } from "@/lib/tenant/branding";

type TenantUserLandingProps = {
  data: TenantMarketingLandingData;
};

export function TenantUserLanding({ data }: TenantUserLandingProps) {
  const displayName = resolveTenantBrandName(data.tenant.name);
  const slogan = data.branding.slogan?.trim() || "회원이 가장 먼저 만나는 테넌트 유저 랜딩";
  const description =
    data.branding.description?.trim() ||
    "테넌트 브랜드와 운영 정보를 확인할 수 있는 공개 시작 화면입니다.";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-14">
      <section className="overflow-hidden rounded-panel border border-line/80 bg-platform-hero px-6 py-8 shadow-lg shadow-ink/5 sm:px-10 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex w-fit rounded-full border border-success-line bg-success-surface px-3 py-1 text-xs font-medium uppercase tracking-brand-wide text-success-deep">
              Tenant Landing
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink-emphasis sm:text-5xl">{displayName}</h1>
              <p className="text-lg font-medium text-ink-strong">{slogan}</p>
              <p className="max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">{description}</p>
            </div>

          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-line/80 bg-white/85 p-5 shadow-sm shadow-ink/5">
              <p className="text-xs font-medium uppercase tracking-brand-wide text-ink-subtle">Primary Access</p>
              <p className="mt-3 text-xl font-semibold text-ink-emphasis">테넌트 브랜드 홈</p>
              <p className="mt-2 text-sm leading-6 text-ink-muted">공개 홈에서는 브랜드 소개만 제공합니다.</p>
            </div>

            <div className="rounded-3xl border border-line/80 bg-ink-emphasis p-5 text-white shadow-sm shadow-ink/10">
              <p className="text-xs font-medium uppercase tracking-brand-wide text-white/55">Brand Layer</p>
              <p className="mt-3 text-xl font-semibold">테넌트 전용 헤더와 푸터</p>
              <p className="mt-2 text-sm leading-6 text-white/72">기존 공용 헤더/푸터 대신 테넌트 브랜드 문맥을 유지하는 공용 셸을 사용합니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <NonBorderCard>
          <CardHeader className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-ink-emphasis text-white">
              <Dumbbell className="size-5" />
            </div>
            <div>
              <CardTitle className="text-ink-emphasis">프로그램 운영</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-ink-muted">
                프로그램 정보와 회원 관리는 관리자 워크스페이스에서 운영합니다.
              </CardDescription>
            </div>
          </CardHeader>
        </NonBorderCard>

        <NonBorderCard>
          <CardHeader className="space-y-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-success-strong text-white">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <CardTitle className="text-ink-emphasis">관리자 중심 운영</CardTitle>
              <CardDescription className="mt-2 text-sm leading-6 text-ink-muted">
                예약, 스토어, 공지, 커뮤니티 공개 페이지는 제공하지 않습니다.
              </CardDescription>
            </div>
          </CardHeader>
        </NonBorderCard>
      </section>
    </main>
  );
}
