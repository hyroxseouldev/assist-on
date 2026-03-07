import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicHeader } from "@/components/navigation/public-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedLegalDocumentsByTenantSlug } from "@/lib/legal/server";

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

export default async function TenantLegalDocumentsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const docs = await getPublishedLegalDocumentsByTenantSlug(tenantSlug);

  if (docs.length === 0) {
    notFound();
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">법적 고지</h1>
            <p className="mt-1 text-sm text-zinc-600">서비스 이용약관과 개인정보처리방침 최신본을 확인할 수 있습니다.</p>
          </div>

          <Card className="border-zinc-200/80 bg-white/95">
            <CardHeader>
              <CardTitle>문서 목록</CardTitle>
              <CardDescription>게시된 문서 기준으로 최신 버전을 보여줍니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {docs.map((doc) => (
                <Link
                  key={`${doc.type}-${doc.locale}-${doc.id}`}
                  href={toDetailPath(tenantSlug, doc.type)}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-3 hover:bg-zinc-50"
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
    </>
  );
}
