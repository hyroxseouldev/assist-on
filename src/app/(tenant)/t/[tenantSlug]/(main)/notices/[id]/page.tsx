import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";

import { ChevronLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedNoticeById } from "@/lib/admin/server";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";

function formatNoticeDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export default async function TenantNoticeDetailPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  const notice = await getPublishedNoticeById(id);

  if (!notice) {
    notFound();
  }

  return (
    <section className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={`/t/${tenantSlug}/notices`}>
          <ChevronLeft className="size-4" />
          목록으로
        </Link>
      </Button>

      <Card className="border-zinc-200/70 bg-white/95">
        <CardHeader className="space-y-3">
          {notice.thumbnail_url ? (
            <div className="relative aspect-square w-28 overflow-hidden rounded-md border border-zinc-200 bg-zinc-50">
              <Image src={notice.thumbnail_url} alt={`${notice.title} 대표 이미지`} fill className="object-cover" />
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">공지</Badge>
            <p className="text-xs text-zinc-500">{formatNoticeDate(notice.created_at)}</p>
          </div>
          <CardTitle className="text-2xl leading-tight tracking-tight text-zinc-900">{notice.title}</CardTitle>
        </CardHeader>

        <CardContent>
          <article
            className="prose prose-zinc max-w-none text-sm [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitizeSessionContent(notice.content_html) }}
          />
        </CardContent>
      </Card>
    </section>
  );
}
