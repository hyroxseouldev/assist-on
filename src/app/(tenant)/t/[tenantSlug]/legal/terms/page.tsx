import Link from "next/link";
import { notFound } from "next/navigation";

import { ChevronLeft } from "lucide-react";

import { PublicHeader } from "@/components/navigation/public-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedLegalDocumentByType, normalizeLegalContentHtml } from "@/lib/legal/server";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";

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

export default async function TenantTermsOfServicePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const document = await getPublishedLegalDocumentByType(tenantSlug, "terms_of_service", "ko");

  if (!document) {
    notFound();
  }

  const contentHtml = sanitizeSessionContent(normalizeLegalContentHtml(document.content_html));

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <section className="space-y-4">
          <Button asChild variant="outline" size="sm">
            <Link href={`/t/${tenantSlug}/legal`}>
              <ChevronLeft className="size-4" />
              문서 목록
            </Link>
          </Button>

          <Card className="border-zinc-200/80 bg-white/95">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{document.locale.toUpperCase()}</Badge>
                <p className="text-xs text-zinc-500">버전 {document.version}</p>
                <p className="text-xs text-zinc-500">게시일 {formatDate(document.published_at)}</p>
              </div>
              <CardTitle className="text-2xl tracking-tight text-zinc-900">{document.title || "이용약관"}</CardTitle>
            </CardHeader>
            <CardContent>
              <article
                className="prose prose-zinc max-w-none text-sm [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
