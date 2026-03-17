import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantPublicSiteDataBySlug } from "@/lib/landing/server";
import { getPublishedLegalDocumentsByTenantSlug } from "@/lib/legal/server";
import { buildTenantMetadata } from "@/lib/tenant/metadata";

const typeLabel: Record<string, string> = {
  privacy_policy: "개인정보처리방침",
  terms_of_service: "이용약관",
};

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function toDetailPath(tenantSlug: string, type: string) {
  if (type === "privacy_policy") {
    return `/t/${tenantSlug}/legal/privacy`;
  }

  return `/t/${tenantSlug}/legal/terms`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;

  return buildTenantMetadata({
    tenantSlug,
    pageTitle: "법적 고지",
    description: "이용약관과 개인정보처리방침 등 공개 문서를 확인할 수 있는 페이지",
  });
}

export default async function TenantLegalDocumentsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const [docs, siteData] = await Promise.all([getPublishedLegalDocumentsByTenantSlug(tenantSlug), getTenantPublicSiteDataBySlug(tenantSlug)]);

  if (docs.length === 0) {
    notFound();
  }

  const brandLabel = siteData?.branding.team_name?.trim() || siteData?.tenant.name || tenantSlug;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="space-y-6">
        <div className="rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-6 sm:p-8">
          <p className="text-sm font-medium text-zinc-500">{brandLabel}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">법적 고지</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
            {brandLabel} 서비스 이용에 필요한 이용약관과 개인정보처리방침 최신본을 확인할 수 있습니다.
          </p>
        </div>

        <Card className="border-zinc-200/80 bg-white/95 shadow-sm">
          <CardHeader>
            <CardTitle>문서 목록</CardTitle>
            <CardDescription>{brandLabel}에 게시된 최신 문서를 기준으로 보여줍니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {docs.map((doc) => (
              <Link
                key={`${doc.type}-${doc.locale}-${doc.id}`}
                href={toDetailPath(tenantSlug, doc.type)}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 px-4 py-4 transition-colors hover:bg-zinc-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{doc.title || typeLabel[doc.type] || doc.type}</p>
                  <p className="mt-1 text-xs text-zinc-500">버전 {doc.version} · 게시일 {formatDate(doc.published_at)}</p>
                </div>
                <Badge variant="secondary">{doc.locale.toUpperCase()}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
