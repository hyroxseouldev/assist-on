"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeSessionContent } from "@/lib/sanitize/session-content";
import type { NoticeRow } from "@/lib/admin/types";

type NoticesListProps = {
  notices: NoticeRow[];
  title: string;
  description: string;
  emptyMessage: string;
  showAllLink?: boolean;
};

function formatNoticeDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function NoticesList({ notices, title, description, emptyMessage, showAllLink = false }: NoticesListProps) {
  const pathname = usePathname();
  const tenantSlugMatch = pathname.match(/^\/t\/([^/]+)/);
  const tenantBasePath = tenantSlugMatch ? `/t/${tenantSlugMatch[1]}` : "";
  const noticesPath = `${tenantBasePath}/notices`;

  return (
    <Card className="border-zinc-200/70 bg-white/90 backdrop-blur-sm">
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          {showAllLink ? (
            <Link href={noticesPath} className="text-sm text-zinc-600 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-900">
              전체보기
            </Link>
          ) : null}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {notices.length === 0 ? (
          <p className="text-sm text-zinc-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-5">
            {notices.map((notice) => (
              <article key={notice.id} className="space-y-2 border-b border-zinc-100 pb-5 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">공지</Badge>
                  <p className="text-xs text-zinc-500">{formatNoticeDate(notice.created_at)}</p>
                </div>
                <h3 className="text-base font-semibold tracking-tight text-zinc-900">{notice.title}</h3>
                <article
                  className="prose prose-zinc max-w-none text-sm [&_p]:my-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeSessionContent(notice.content_html) }}
                />
              </article>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
