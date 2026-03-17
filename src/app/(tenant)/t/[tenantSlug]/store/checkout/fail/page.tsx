import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantStoreCheckoutPath, getTenantStorePath } from "@/lib/store/paths";

function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>;
}

function SectionCard({ children }: { children: ReactNode }) {
  return <Card className="border-none shadow-none">{children}</Card>;
}

export default async function PublicCheckoutFailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ code?: string; message?: string; productId?: string; duration?: string }>;
}) {
  const { tenantSlug } = await params;
  const { code, message, productId, duration } = await searchParams;
  const storePath = getTenantStorePath(tenantSlug);
  const retryHref = productId
    ? `${getTenantStoreCheckoutPath(tenantSlug, productId)}${duration ? `?duration=${duration}` : ""}`
    : storePath;

  return (
    <PageShell>
      <div className="space-y-6">
        <SectionCard>
          <CardHeader className="space-y-3">
            <div className="inline-flex w-fit rounded-full bg-rose-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-rose-700">
              Payment Failed
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-900">결제가 완료되지 않았습니다.</CardTitle>
              <CardDescription className="text-sm leading-6 text-zinc-600">
                결제는 처리되지 않았으며, 정보 확인 후 다시 시도할 수 있습니다.
              </CardDescription>
            </div>
          </CardHeader>
        </SectionCard>

        <SectionCard>
          <CardHeader>
            <CardTitle>오류 상세</CardTitle>
            <CardDescription>문제가 반복되면 아래 내용을 확인해 문의해 주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-sm leading-6 text-rose-950">
              <p className="font-semibold text-rose-900">{message ?? "잠시 후 다시 시도해 주세요."}</p>
              {code ? <p className="mt-2 text-rose-800">오류 코드: {code}</p> : null}
            </div>
          </CardContent>
        </SectionCard>

        <SectionCard>
          <CardHeader>
            <CardTitle>다음 단계</CardTitle>
            <CardDescription>결제 페이지로 돌아가 다시 시도하거나 스토어 홈으로 이동할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-11 px-5">
                <Link href={retryHref}>다시 시도하기</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-5">
                <Link href={storePath}>스토어로 이동</Link>
              </Button>
              <Button asChild variant="ghost" className="h-11 px-5">
                <Link href={`/t/${tenantSlug}`}>홈으로 이동</Link>
              </Button>
            </div>
          </CardContent>
        </SectionCard>
      </div>
    </PageShell>
  );
}
